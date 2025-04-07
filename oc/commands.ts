// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import {
  bold,
  brightGreen,
  brightWhite,
  brightCyan,
} from "https://deno.land/std/fmt/colors.ts";

import { command } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger } from "../utility/index.ts";
import { Oc } from "./index.ts";
import { DeployInfo } from "./deploy-info.ts";

type OcActionCallback = (project: string) => Promise<any>;

export default class OcCommands {
  @command("oc.login", "Login to openshift environment", [
    "oc.login dev --promptPassword --force",
  ])
  async openShiftLogin() {
    if (!Options.env && Options.args.length < 2) {
      logger.fatal("Missing download environment");
    }

    const profile: string = Options.url || Options.project || Options.args[1];

    const deployInfo = DeployInfo.getDeploymentInfo(profile);
    if (Options.verbose) {
      console.log(deployInfo);
    }

    const oc = new Oc();
    await oc.login(deployInfo);
    await oc.logProject();
  }

  @command("deploy, oc.deploy", "Deploy to OpenShift", [
    "deploy env https://artifactory.company.com/artifactory/oc-project/XXXX-api/XXX-api-2.1.7-beta.40.tgz",
    "deploy env https://artifactory.company.com/artifactory/oc-project/XXXX-api/XXX-api-2.1.7-beta.40.tgz --login --server beta",
  ])
  async deploy() {
    const url: string = Options.url || Options.getArg(2);
    if (!url) {
      logger.fatal("Missing download Uri");
    }

    const profile = OcCommands.getProfile();
    const deployInfo = await OcCommands.ensureProfile(profile);

    await Oc.deploy(url, deployInfo);
  }

  @command("helm.list,oc.deployments", "Get OpenShift releases", [
    "oc.releases dev",
  ])
  async releases() {
    const profile = OcCommands.getProfile();
    const deployInfo = await OcCommands.ensureProfile(profile);

    const oc = new Oc();

    const results = await OcCommands.runOcCommand<string[]>(
      deployInfo,
      (project) => oc.releases(project)
    );

    results.forEach((result) => {
      if (result.values.length === 0) return;

      console.log(result.project);
      console.log("-----------------");
      console.log(result.values.join("\n"));
      console.log("");
    });
  }

  @command("oc.routes", "Get OpenShift routes", ["oc.routes dev"])
  async routes() {
    const profile = OcCommands.getProfile();
    const deployInfo = await OcCommands.ensureProfile(profile);

    const oc = new Oc();

    const results = await OcCommands.runOcCommand<any[]>(
      deployInfo,
      (project) => oc.routes(project)
    );

    results.forEach((result) => {
      if (result.values.length === 0) return;

      console.log(result.project);
      console.log("-----------------");
      console.log(
        result.values
          .map(
            (item) =>
              `${item?.name.padEnd(30)} ${item?.termination.padEnd(10)} ${
                item?.host
              }`
          )
          .join("\n")
      );
      console.log("");
    });
  }

  @command("oc.pods", "Get OpenShift pods", ["oc.pods dev"])
  async pods() {
    const profile = OcCommands.getProfile();
    const deployInfo = await OcCommands.ensureProfile(profile);

    const oc = new Oc();

    const results = await OcCommands.runOcCommand<any[]>(
      deployInfo,
      (project) => oc.pods(project)
    );

    results.forEach((result) => {
      if (result.values.length === 0) return;

      console.log(result.project);
      console.log("-----------------");
      console.log(
        result.values
          .map((item) => `${item?.component.padEnd(30)} ${item?.name}`)
          .join("\n")
      );
      console.log("");
    });
  }

  private static async runOcCommand<T>(
    deployInfo: DeployInfo,
    action: OcActionCallback
  ) {
    const serverName = deployInfo.server
      .replaceAll("https://", "")
      .split(":")[0];

    // prettier-ignore
    console.log(`
Running for
arg:        ${brightGreen(bold(deployInfo.arg))}
project:    ${brightWhite(bold(deployInfo.project))}
server:     ${brightCyan(bold(serverName))}
`
    );

    const oc = new Oc();

    const projects = await oc.projects();
    const tasks = projects
      .filter((project) => project.endsWith(deployInfo.arg))
      .map(async (project) => {
        const results = await action(project);
        return {
          project: project,
          values: results as T,
        };
      });
    return await Promise.all(tasks);
  }

  private static getProfile(defaultProfile: string = "dev") {
    const profileArg = Options.getArg(1) || "";
    const profile: string = Options.profile || profileArg || defaultProfile;
    return profile;
  }

  private static async ensureProfile(profile: string) {
    const deployInfo = DeployInfo.getDeploymentInfo(profile);
    if (Options.verbose) {
      console.log(deployInfo);
    }

    if (Options.login) {
      const oc = new Oc();
      await oc.login(deployInfo);
      await oc.logProject();
    }

    return deployInfo;
  }
}
