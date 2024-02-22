// deno-lint-ignore-file no-explicit-any

import { action } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger } from "../utility/index.ts";
import Utility from "../utility/utility.ts";
import { Mvn } from "./index.ts";

type MvnActionCallback = (...args: any[]) => Promise<any>;

export default class MvnCommands {
  @action("mvn", "Run maven command")
  async runMaven() {
    await MvnCommands.runMvnCommand(MvnCommands.runMavenCommand);
  }

  @action("mvn.info", "Get mvn info")
  async info() {
    await MvnCommands.runMvnCommand(MvnCommands.logInfo);
  }

  private static getAllRepos(folder: string) {
    const mvn = new Mvn();
    return mvn.listRepos(folder);
  }

  private static async runMvnCommand(action: MvnActionCallback) {
    let folder = Options.folder || Deno.cwd();

    if (Options.all) {
      return await MvnCommands.forAllRepos(folder, action);
    } else {
      const mvn = new Mvn();
      const mvnFolder = mvn.mvnFolder(folder);
      if (!mvnFolder) {
        logger.error(`No mvn repository found for ${folder}`);
        return;
      }

      return await action(mvnFolder);
    }
  }

  private static async logInfo(folder: string) {
    const mvn = new Mvn();
    const info = await mvn.config(folder);
    logger.info(folder);
    console.log(info);
  }

  private static async forAllRepos(folder: string, action: MvnActionCallback) {
    const repos = MvnCommands.getAllRepos(folder);

    const tasks = repos.map((folder) => action(folder));

    return await Promise.all(tasks);
  }

  private static async runMavenCommand(folder: string) {
    const mvn = new Mvn();

    const actions: string[] = Options.args.slice(1);

    Utility.forEachParallel(actions, async (action) => {
      await mvn.maven(folder, action);
    });

    logger.highlight(`Maven command ${actions.join(" ")} ${folder}`);
  }
}
