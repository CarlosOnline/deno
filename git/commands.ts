import { action } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger } from "../utility/index.ts";
import Utility from "../utility/utility.ts";
import { Git } from "./index.ts";

export default class GitCommands {
  @action("git.info", "Get git info")
  info() {
    const folder = Options.folder || Deno.cwd();
    const git = new Git();
    const info = git.info(folder);
    logger.info(folder);
    console.log(info);
  }

  @action("git.merge", "Merge from develop")
  mergeFromDevelop() {
    const folder = Options.folder || Deno.cwd();
    GitCommands.mergeFromDevelopBranch(folder);
  }

  @action("git.mergeAll", "Merge all repos from develop")
  mergeAllFromDevelop() {
    const folder = Options.folder || Deno.cwd();

    const git = new Git();
    const repos = git.listRepos(folder);

    repos.forEach((folder) => {
      GitCommands.mergeFromDevelopBranch(folder);
    });
  }

  private static mergeFromDevelopBranch(folder: string) {
    const git = new Git();
    const info = git.info(folder);
    if (!info) {
      logger.error(`Not a git repository for ${folder}`);
      return;
    }

    if (Options.reset) {
      Utility.run(Options.git.cmd, "reset --hard".split(" "), folder);
    }

    git.mergeFromBranch(`origin/${info.develop}`, folder);
    logger.info(`Merged ${folder}`);
  }
}
