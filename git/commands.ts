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
      await GitCommands.getBranchForAllRepos(folder);
    } else {
      await GitCommands.getBranchForRepo(folder);
    }
  }

  @action("git.info", "Get git info")
  async info() {
    const folder = Options.folder || Deno.cwd();
    const git = new Git();
    const info = await git.info(folder);
    logger.info(folder);
    console.log(info);
  }

  @action("git.develop", "Checkout develop")
  async checkoutDevelop() {
    const folder = Options.folder || Deno.cwd();

    if (Options.all) {
      await GitCommands.checkoutDevelopForAllRepos(folder);
    } else {
      await GitCommands.checkoutDevelopForRepo(folder);
    }
  }

  @action("git.merge", "Merge from develop")
  async mergeFromDevelop() {
    const folder = Options.folder || Deno.cwd();

    if (Options.all) {
      await GitCommands.mergeFromDevelopBranchForAllRepos(folder);
    } else {
      await GitCommands.mergeFromDevelopBranch(folder);
    }
  }

  private static getAllRepos(folder: string) {
    const git = new Git();
    return git.listRepos(folder);
  }

  private static async checkoutDevelopForRepo(folder: string) {
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

  private static async checkoutDevelopForAllRepos(folder: string) {
    const repos = GitCommands.getAllRepos(folder);

    const tasks = repos.map((folder) =>
      GitCommands.checkoutDevelopForRepo(folder)
    );

    await Promise.all(tasks);
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

  private static async mergeFromDevelopBranchForAllRepos(folder: string) {
    const repos = GitCommands.getAllRepos(folder);

    const tasks = repos.map((folder) =>
      GitCommands.mergeFromDevelopBranch(folder)
    );

    await Promise.all(tasks);
  }

  private static async getBranchForRepo(folder: string) {
    const git = new Git();
    const branch = await git.branch(folder);
    logger.highlight(`Branch ${branch} ${folder}`);
  }

  private static async getBranchForAllRepos(folder: string) {
    const repos = GitCommands.getAllRepos(folder);

    const tasks = repos.map((folder) => GitCommands.getBranchForRepo(folder));

    await Promise.all(tasks);
  }
}
