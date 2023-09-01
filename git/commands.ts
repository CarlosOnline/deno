// deno-lint-ignore-file no-explicit-any

import { action } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger } from "../utility/index.ts";
import Utility from "../utility/utility.ts";
import { Git } from "./index.ts";

type GitActionCallback = (...args: any[]) => Promise<any>;

export default class GitCommands {
  @action("git.branch", "Get/Create branch")
  async getBranch() {
    if (!Options.args.length) {
      await GitCommands.runGitCommand(GitCommands.getBranch);
    } else {
      await GitCommands.runGitCommand(GitCommands.createBranch);
    }
  }

  @action("git.info", "Get git info")
  async info() {
    await GitCommands.runGitCommand(GitCommands.logInfo);
  }

  @action("git.develop", "Checkout develop")
  async checkoutDevelop() {
    await GitCommands.runGitCommand(GitCommands.checkoutDevelop);
  }

  @action("git.merge", "Merge from develop")
  async mergeFromDevelop() {
    await GitCommands.runGitCommand(GitCommands.mergeFromDevelopBranch);
  }

  @action("git.pull", "Pull repositories")
  async pull() {
    await GitCommands.runGitCommand(GitCommands.pullRepo);
  }

  @action("git.status", "Get status")
  async status() {
    await GitCommands.runGitCommand(GitCommands.statusOfRepo);
  }

  private static getAllRepos(folder: string) {
    const git = new Git();
    return git.listRepos(folder);
  }

  private static async runGitCommand(action: GitActionCallback) {
    const folder = Options.folder || Deno.cwd();

    if (Options.all) {
      await GitCommands.forAllRepos(folder, action);
    } else {
      await action(folder);
    }
  }

  private static async forAllRepos(folder: string, action: GitActionCallback) {
    const repos = GitCommands.getAllRepos(folder);

    const tasks = repos.map((folder) => action(folder));

    await Promise.all(tasks);
  }

  private static async checkoutBranch(folder: string) {
    const branch = Options.branch || Options.args[1];
    if (!branch) {
      logger.error(`Missing branch name for ${folder}`);
      return;
    }

    logger.highlight(`Checkout ${branch} ${folder}`);

    const git = new Git();
    const config = git.config(folder);
    if (!config) {
      logger.error(`Not a git repository for ${folder}`);
      return;
    }

    await git.checkout(branch, folder);

    await git.pull(folder);

    logger.highlight(`Checked out ${branch} ${folder}`);
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

  private static async createBranch(folder: string) {
    const branch = Options.branch || Options.args[1];
    if (!branch) {
      logger.error(`Missing branch name for ${folder}`);
      return;
    }

    const git = new Git();
    const info = await git.info(folder);
    if (!info) {
      logger.error(`Not a git repository for ${folder}`);
      return;
    }

    if (info.remotes.includes(branch) || info.locals.includes(branch)) {
      await git.checkout(branch, folder);
      logger.info(`Checked out ${branch} for ${folder}`);
      return;
    }

    await git.createBranch(branch, info.develop, folder);

    logger.highlight(`Branch ${branch} ${folder}`);
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

  private static async pullRepo(folder: string) {
    logger.highlight(`pull ${folder}`);

    const git = new Git();
    const config = git.config(folder);
    if (!config) {
      logger.error(`Not a git repository for ${folder}`);
      return;
    }

    await git.pull(folder);

    logger.highlight(`Pulled ${folder}`);
  }

  private static async statusOfRepo(folder: string) {
    logger.highlight(`status ${folder}`);

    const git = new Git();
    const config = git.config(folder);
    if (!config) {
      logger.error(`Not a git repository for ${folder}`);
      return;
    }

    await git.statusLog(folder);

    logger.highlight(`Statused ${folder}`);
  }
}
