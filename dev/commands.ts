// deno-lint-ignore-file no-explicit-any

import { command } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger, Utility } from "../utility/index.ts";
import { Oc } from "./index.ts";
import { DeployInfo } from "./deploy-info.ts";
import Token from "./token.ts";

export default class DevCommands {
  @command("options", "Display options")
  dumpOptions() {
    console.log(Options);
  }

  @command("deploy, oc.deploy", "Deploy to OpenShift", [
    "deploy env https://artifactory.company.com/artifactory/oc-project/XXXX-api/XXX-api-2.1.7-beta.40.tgz",
    "deploy env https://artifactory.company.com/artifactory/oc-project/XXXX-api/XXX-api-2.1.7-beta.40.tgz --login --server beta",
  ])
  async deploy() {
    const profileArg = Options.getArg(1) || "";
    const profile: string = Options.profile || profileArg || "dev";

    if (!profile) {
      throw new Error("Missing profile");
    }

    const url: string = Options.url || Options.getArg(2);
    if (!url) {
      logger.fatal("Missing download Uri");
    }

    const deployInfo = DeployInfo.getDeploymentInfo(profile);
    console.log(deployInfo);

    if (Options.login) {
      const oc = new Oc();
      await oc.login(deployInfo);
      await oc.logProject();
    }

    await Oc.deploy(url, deployInfo);
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

  @command("oc.login", "Login to openshift environment", [
    "oc.login dev --promptPassword",
  ])
  async openShiftLogin() {
    if (!Options.env && Options.args.length < 2) {
      logger.fatal("Missing download environment");
    }

    const profile: string = Options.url || Options.project || Options.args[1];

    const deployInfo = DeployInfo.getDeploymentInfo(profile);
    console.log(deployInfo);

    const oc = new Oc();
    await oc.login(deployInfo);
    await oc.logProject();
  }

  @command("test", "test")
  testMethod() {
    logger.info("Test method called");
  }
}
