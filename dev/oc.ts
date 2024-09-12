// deno-lint-ignore-file no-explicit-any
import { brightYellow, red, bold } from "https://deno.land/std/fmt/colors.ts";

import Options from "../support/options.ts";
import {
  DefaultRunOptions,
  RunOptions,
  logger,
  Utility,
} from "../utility/index.ts";

export class Oc {
  async project() {
    const results = await this.runAsync(["project", "-q"]);
    return results;
  }

  async logProject() {
    const results = await this.runAsync(["project"], Deno.cwd(), {
      ...DefaultRunOptions,
      ...{ verbose: Options.verbose },
      ...{ capture: false },
    });
    return results;
  }

  async login(env: string) {
    const userName = Deno.env.get("USERNAME") as string;
    const project = Options.project || Options.openshift[env].project;
    const server = Options.server || Options.openshift[env].server;
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

  static async deploy(url: string, profile: string) {
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

    const deleteCommandLine = `helm delete ${api}`;
    logger.info(deleteCommandLine);

    const commandLine = `helm upgrade -i --set profile=${profile} ${api} ${url}`;
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
      `upgrade -i --set profile=${profile} ${api} ${url}`.split(" "),
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
