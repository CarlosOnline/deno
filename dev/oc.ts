// deno-lint-ignore-file no-explicit-any

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
