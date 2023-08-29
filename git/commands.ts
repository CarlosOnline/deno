import { action } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger } from "../utility/index.ts";
import Utility from "../utility/utility.ts";
import { Git } from "./index.ts";

export default class GitCommands {
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
    await GitCommands.checkoutDevelopForRepo(folder);
  }

  @action("git.developAll", "Checkout develop in all repos")
  async checkoutDevelopForAll() {
    const folder = Options.folder || Deno.cwd();

    const git = new Git();
    const repos = git.listRepos(folder);

    const tasks = repos.map((folder) =>
      GitCommands.checkoutDevelopForRepo(folder)
    );

    await Promise.all(tasks);
  }

  @action("git.merge", "Merge from develop")
  async mergeFromDevelop() {
    const folder = Options.folder || Deno.cwd();
    await GitCommands.mergeFromDevelopBranch(folder);
  }

  @action("git.mergeAll", "Merge all repos from develop")
  async mergeAllFromDevelop() {
    const folder = Options.folder || Deno.cwd();

    const git = new Git();
    const repos = git.listRepos(folder);

    const tasks = repos.map((folder) =>
      GitCommands.mergeFromDevelopBranch(folder)
    );

    await Promise.all(tasks);
  }

  private static async checkoutDevelopForRepo(folder: string) {
    logger.highlight(`Merging ${folder}`);

    const git = new Git();
    const info = await git.info(folder);
    if (!info) {
      logger.error(`Not a git repository for ${folder}`);
      return;
    }

    const branch = `origin/${info.develop}`;
    await git.checkout(branch, folder);
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
}
