// deno-lint-ignore-file no-explicit-any
import {
  brightYellow,
  red,
  bold,
  brightGreen,
  brightCyan,
  brightWhite,
} from "https://deno.land/std/fmt/colors.ts";

import Options from "../support/options.ts";
import {
  DefaultRunOptions,
  RunOptions,
  logger,
  Utility,
} from "../utility/index.ts";
import { DeployInfo } from "./deploy-info.ts";

export class Oc {
  async project() {
    const results = await this.runAsync(["project", "-q"]);
    return results;
  }

  async projects() {
    const results = await this.runAsync(["projects", "-q"]);

    const projects = results
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => {
        return (
          Options.openshift.projects.startsWith.filter((prefix: string) => {
            return item.startsWith(prefix);
          }).length > 0
        );
      });

    return projects;
  }

  async logProject() {
    const results = await this.runAsync(["project"], Deno.cwd(), {
      ...DefaultRunOptions,
      ...{ verbose: Options.verbose },
      ...{ capture: false },
    });
    return results;
  }

  async releases(namespace: string = "") {
    const namespaceArgs = namespace ? ["--namespace", namespace] : [];
    const output = await this.runAsync([
      "get",
      "deployments",
      "--output",
      'jsonpath="{range .items[*]}{.metadata.name} "',
      ...namespaceArgs,
    ]);

    return output.split(" ");
  }

  async routes(namespace: string = "") {
    const namespaceArgs = namespace ? ["--namespace", namespace] : [];
    const output = await this.runAsync([
      "get",
      "routes",
      "--output",
      'jsonpath="{range .items[*]}{.metadata.name},{.spec.host},{.spec.tls.termination} "',
      ...namespaceArgs,
    ]);

    return output
      .split(" ")
      .map((item) => {
        const parts = item.split(",");
        if (parts.length < 3 || !parts[0] || !parts[1]) return null;
        return {
          name: parts[0],
          host: parts[1],
          termination: parts[2],
        };
      })
      .filter((item) => item);
  }

  async pods(namespace: string = "") {
    const namespaceArgs = namespace ? ["--namespace", namespace] : [];
    const output = await this.runAsync([
      "get",
      "pods",
      "--output",
      'jsonpath="{range .items[*]}{.metadata.name},{.metadata.labels.component} "',
      ...namespaceArgs,
    ]);

    return output
      .split(" ")
      .map((item) => {
        const parts = item.split(",");
        if (parts.length < 2 || !parts[0] || !parts[1]) return null;
        return {
          name: parts[0],
          component: parts[1],
        };
      })
      .filter((item) => item);
  }

  async login(deployInfo: DeployInfo) {
    const userName = Deno.env.get("USERNAME") as string;
    const password = await this.getPassword();

    if (!password || !userName || !deployInfo.project || !deployInfo.server) {
      logger.error("Missing password, username, project or server.");
      return;
    }

    // prettier-ignore
    console.log(`
Login to
arg:        ${brightWhite(bold(deployInfo.arg))}
project:    ${brightGreen(bold(deployInfo.project))}
server:     ${brightCyan(bold(deployInfo.server))}
`
    );

    // oc login -u=carlos.gomes -p=**** -s=%_Server% -n %_Project%
    console.log(
      `oc login -u=${userName} -p=**** -n=${deployInfo.project} -s=${deployInfo.server}`
    );

    const results = await this.runAsync([
      "login",
      `-u=${userName}`,
      `-p=${password}`,
      `-n=${deployInfo.project}`,
      `-s=${deployInfo.server}`,
    ]);
    return results;
  }

  async loginEnv(env: string) {
    const userName = Deno.env.get("USERNAME") as string;
    const project =
      Options.project || Options.openshift.environments[env].project;
    const server = Options.server || Options.openshift.environments[env].server;
    const password = await this.getPassword();

    if (!password || !userName || !project || !server) {
      logger.error("Missing password, username, project or server.");
      return;
    }

    // oc login -u=carlos.gomes -p=**** -s=%_Server% -n %_Project%
    console.log(`oc login -u=${userName} -p=**** -n=${project} -s=${server}`);

    const results = await this.runAsync([
      "login",
      `-u=${userName}`,
      `-p=${password}`,
      `-n=${project}`,
      `-s=${server}`,
    ]);
    return results;
  }

  static async deploy(url: string, deployInfo: DeployInfo) {
    const profile = deployInfo.project;

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

    const projectDeployInfo = DeployInfo.parseNamespace(profile);
    console.log(projectDeployInfo);

    if (!project || projectDeployInfo.env != deployInfo.env) {
      logger.fatal(
        `Project ${project} not set to ${profile} using ${deployInfo.env}`
      );
      return;
    }

    logger.warn(`Deploying ${api}`);

    const deleteCommandLine = `helm delete ${api}`;
    logger.info(deleteCommandLine);

    const commandLine = `helm upgrade -i --set profile=${deployInfo.env} ${api} ${url}`;
    logger.info(commandLine);

    const proceed = confirm(
      `Deploy to ${brightYellow(bold(api))} on ${red(
        bold(project)
      )} for ${profile}?`
    );

    if (!proceed) return;

    await Utility.run.runAsync(
      Utility.path.basename(Options.helm),
      `delete ${api}`.split(" "),
      Utility.path.dirname(Options.helm),
      {
        skipEscape: true,
      }
    );

    await Utility.run.runAsync(
      Utility.path.basename(Options.helm),
      `upgrade -i --set profile=${deployInfo.env} ${api} ${url}`.split(" "),
      Utility.path.dirname(Options.helm),
      {
        skipEscape: true,
      }
    );

    if (Options.verbose) {
      await Utility.run.runAsync(
        Utility.path.basename(Options.helm),
        `get all ${api}`.split(" "),
        Utility.path.dirname(Options.helm),
        {
          skipEscape: true,
        }
      );
    }
  }

  private async runAsync(
    args: string[],
    folder: string = Deno.cwd(),
    runOptions: RunOptions = {
      ...DefaultRunOptions,
      ...{ verbose: Options.verbose },
      ...{ capture: true },
    }
  ) {
    const results = await Utility.run.runAsync(Options.oc, args, folder, {
      ...runOptions,
      ...{ verbose: Options.verbose },
    });
    if (results && results.startsWith("ERROR")) {
      logger.error(`oc ${args.join(" ")} failed for ${folder}`);
    }
    return results;
  }

  private async runHelmAsync(
    args: string[],
    folder: string = Deno.cwd(),
    runOptions: RunOptions = {
      ...DefaultRunOptions,
      ...{ verbose: Options.verbose },
      ...{ capture: true },
    }
  ) {
    console.log(Options.helm, args.join(" "));
    const results = await Utility.run.runAsync(Options.helm, args, folder, {
      ...runOptions,
      ...{ verbose: Options.verbose },
    });
    if (results && results.startsWith("ERROR")) {
      logger.error(`helm ${args.join(" ")} failed for ${folder}`);
    }
    return results;
  }

  private async getPassword() {
    const kv = await Deno.openKv();
    let password = Options.password;

    if (!Options.promptPassword) {
      if (password) {
        await kv.set(["password"], password);
        console.log("Password saved.");
      } else {
        const passwordData: any = await kv.get(["password"]);
        password = passwordData?.value;
      }
    }

    if (!password) {
      password = prompt("Enter password: ");
      await kv.set(["password"], password);
    }
    return password;
  }
}
