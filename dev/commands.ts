// deno-lint-ignore-file no-explicit-any
import { brightYellow, red, bold } from "https://deno.land/std/fmt/colors.ts";

import { command, loadEnvironmentFile } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger, Url, UrlInfo, Utility } from "../utility/index.ts";
import { Oc } from "./index.ts";
import Token from "./token.ts";

export default class DevCommands {
  @command("options", "Display options")
  dumpOptions() {
    console.log(Options);
  }

  @command("deploy", "Deploy to profile", [
    "deploy https://artifactory.company.com/artifactory/oc-project/XXXX-api/XXX-api-2.1.7-beta.40.tgz",
  ])
  async deploy() {
    if (!Options.url && Options.args.length < 2) {
      logger.fatal("Missing download Uri");
    }

    const url: string = Options.url || Options.args[1];
    const profile: string = Options.profile || "dev";

    await DevCommands.deployToProfile(url, profile);
  }

  @command("token", "Get authorization token", [
    "token",
    "token api-name environment",
    "token spotcheck UAT",
    "token reference dev",
  ])
  async getToken() {
    const service =
      Options.args.length >= 2 ? Options.args[1].toLocaleLowerCase() : "";
    const env =
      Options.args.length >= 3 ? Options.args[2].toLocaleLowerCase() : "";

    const token = await Token.getToken(service, env);
    if (!token) {
      logger.fatal("Failed to get token");
      return;
    }
    logger.info(token);

    await Utility.copyTextToClipboard(token);

    return token;
  }

  @command("oc.login", "Login to openshift environment", ["oc.login dev"])
  async openShiftLogin() {
    if (!Options.env && Options.args.length < 2) {
      logger.fatal("Missing download environment");
    }

    const env: string = Options.url || Options.args[1];

    const oc = new Oc();
    await oc.login(env);
  }

  @command("test", "test")
  testMethod() {
    logger.info("Test method called");
  }

  /**
   * ISSUE: Does not work, authorization required
   * Fetch build log from github build server
   * @param url Url to build log
   * @returns Build log contents
   */
  private static async fetchBuildLog(url: string) {
    const urlInfo = new UrlInfo("GET", url);
    const response = await Url.fetch(urlInfo, "");
    if (!response.ok || !response.body) {
      throw new Error(`Error fetching url: ${response.error}`);
    }

    return response.body;
  }

  private static getDownloadUriFromContents(contents: string) {
    const pattern = /.\"+downloadUri\" : \"(?<downloadUri>[^"]+)\".*/;
    const match = contents.match(pattern);
    if (match?.groups && match.groups.downloadUri) {
      return match.groups.downloadUri;
    }

    throw new Error("Failed to match download uri pattern");
  }

  private static async getDownloadUri(url: string) {
    const contents = await DevCommands.fetchBuildLog(url);
    console.log(contents);
    return DevCommands.getDownloadUriFromContents(contents);
  }

  private static async deployToProfile(url: string, profile: string) {
    const rex = new RegExp(
      `https:\/\/artifactory[a-z-]+.[a-z]+.com\/artifactory\/[a-z-]+\/(?<api>[^/]+)\/(?<api2>.+)-.*.tgz`
    );
    const match = url.match(rex);
    if (!match?.groups) {
      logger.warn("Failed to match download uri pattern");
      return;
    }

    const api = match.groups.api;
    const api2 = match.groups.api2;

    if (api != api2 && !api2.startsWith(api)) {
      logger.warn(`api name mismatch: ${api} != ${api2}`);
    }

    const oc = new Oc();
    const project = await oc.project();
    if (!project || !project.endsWith(profile)) {
      logger.fatal(`Project ${project} not set to ${profile}`);
      return;
    }

    logger.warn(`Deploying ${api}`);

    const commandLine = `helm upgrade -i --set profile=${profile} ${api} ${url}`;
    logger.info(commandLine);

    const proceed = confirm(
      `Deploy to ${brightYellow(bold(api))} on ${red(
        bold(project)
      )} for ${profile}?`
    );
    if (proceed) {
      await Utility.run.runAsync(
        Utility.path.basename(Options.helm),
        `upgrade -i --set profile=dev ${api} ${url}`.split(" "),
        Utility.path.dirname(Options.helm),
        {
          skipEscape: true,
        }
      );
    }
  }
}
