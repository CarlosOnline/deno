// deno-lint-ignore-file no-explicit-any

import { command } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger } from "../utility/index.ts";
import { Oc } from "./index.ts";
import { DeployInfo } from "./deploy-info.ts";

type OcActionCallback = (project: string) => Promise<any>;

export default class OcCommands {
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

  @command("helm.list,oc.deployments", "Get OpenShift releases", [
    "oc.releases dev",
  ])
  async releases() {
    const oc = new Oc();

    const results = await OcCommands.runOcCommand<string[]>((project) =>
      oc.releases(project)
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
    const oc = new Oc();

    const results = await OcCommands.runOcCommand<any[]>((project) =>
      oc.routes(project)
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
    const oc = new Oc();

    const results = await OcCommands.runOcCommand<any[]>((project) =>
      oc.pods(project)
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

  private static async runOcCommand<T>(action: OcActionCallback) {
    const oc = new Oc();

    const profileArg = Options.getArg(1) || "";
    const profile: string = Options.profile || profileArg || "dev";

    const projects = await oc.projects();
    const tasks = projects
      .filter((project) => project.endsWith(profile))
      .map(async (project) => {
        const results = await action(project);
        return {
          project: project,
          values: results as T,
        };
      });
    return await Promise.all(tasks);
  }
}
