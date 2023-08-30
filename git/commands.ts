import { action } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger } from "../utility/index.ts";
import Utility from "../utility/utility.ts";
import { Git } from "./index.ts";

export default class GitCommands {
  @action("git.branch", "Get branch")
  async getBranch() {
    const folder = Options.folder || Deno.cwd();

    if (Options.all) {
      await GitCommands.forAllRepos(folder, GitCommands.getBranch);
    } else {
      await GitCommands.getBranch(folder);
    }
  }

  @action("git.info", "Get git info")
  async info() {
    const folder = Options.folder || Deno.cwd();
    const git = new Git();
    const info = await git.info(folder);
    logger.info(folder);
    console.log(info);

    if (Options.all) {
      await GitCommands.forAllRepos(folder, GitCommands.logInfo);
    } else {
      await GitCommands.logInfo(folder);
    }
  }

  @action("git.develop", "Checkout develop")
  async checkoutDevelop() {
    const folder = Options.folder || Deno.cwd();

    if (Options.all) {
      await GitCommands.forAllRepos(folder, GitCommands.checkoutDevelop);
    } else {
      await GitCommands.checkoutDevelop(folder);
    }
  }

  @action("git.merge", "Merge from develop")
  async mergeFromDevelop() {
    const folder = Options.folder || Deno.cwd();

    if (Options.all) {
      await GitCommands.forAllRepos(folder, GitCommands.mergeFromDevelopBranch);
    } else {
      await GitCommands.mergeFromDevelopBranch(folder);
    }
  }

  private static getAllRepos(folder: string) {
    const git = new Git();
    return git.listRepos(folder);
  }

  private static async forAllRepos(
    folder: string,
    action: (folder: string) => Promise<void>
  ) {
    const repos = GitCommands.getAllRepos(folder);

    const tasks = repos.map((folder) => action(folder));

    await Promise.all(tasks);
  }

  private static async checkoutDevelop(folder: string) {
    logger.highlight(`Checkout develop ${folder}`);

    const git = new Git();
    const info = await git.info(folder);
    if (!info) {
      logger.error(`Not a git repository for ${folder}`);
      return;
    }

    const branch = info.develop;
    await git.checkout(branch, folder);

    await git.pull(folder);

    logger.highlight(`Checked out ${branch} ${folder}`);
  }

  private static async mergeFromDevelopBranch(folder: string) {
    logger.highlight(`Merging ${folder}`);

    const git = new Git();
    const info = await git.info(folder);
    if (!info) {
      logger.error(`Not a git repository for ${folder}`);
      return;
    }

    if (Options.reset) {
      await Utility.runAsync(
        Options.git.cmd,
        "reset --hard".split(" "),
        folder
      );
    }

    await git.mergeFromBranch(`origin/${info.develop}`, folder);
    logger.highlight(`Merged ${folder}`);
  }

  private static async getBranch(folder: string) {
    const git = new Git();
    const branch = await git.branch(folder);
    logger.highlight(`Branch ${branch} ${folder}`);
  }

  private static async logInfo(folder: string) {
    const git = new Git();
    const info = await git.info(folder);
    logger.info(folder);
    console.log(info);
  }
}
