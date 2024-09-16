// deno-lint-ignore-file no-explicit-any
import "reflect-metadata";

import { command } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger, Utility } from "../utility/index.ts";
import { Config, Git } from "./index.ts";

type GitActionCallback = (...args: any[]) => Promise<any>;

type GitUndoChanges = {
  repo: string;
  folder: string;
  status: string[];
};

export default class GitCommands {
  @command("create_pr", "Create pull request")
  async createPullRequest() {
    await GitCommands.runGitCommand(GitCommands.createPullRequest);
  }

  @command("git.branch", "Get/Create branch")
  async getBranch() {
    if (Options.args.length == 1) {
      await GitCommands.runGitCommand(GitCommands.getBranch);
    } else {
      await GitCommands.runGitCommand(GitCommands.createBranch);
    }
  }

  @command("git.delete_branch", "Delete branch")
  async deleteBranch() {
    const folder = Options.folder || Deno.cwd();
    const branch = Options.branch || Options.args[1];

    if (!branch) {
      logger.error(`Missing branch name for ${folder}`);
      return;
    }

    const git = new Git();
    await git.deleteBranch(branch, folder);
  }

  @command("git.branch_list", "Get/Create branch")
  async getBranchList() {
    await GitCommands.runGitCommand(GitCommands.getBranchList);
  }

  @command("git.clone", "Generate git clone commands")
  async generateGitCloneCommands() {
    await GitCommands.runGitCommand(GitCommands.generateGitCloneCommand);
  }

  @command("git.info", "Get git info")
  async info() {
    await GitCommands.runGitCommand(GitCommands.logInfo);
  }

  @command("git.develop", "Checkout develop")
  async checkoutDevelop() {
    await GitCommands.runGitCommand(GitCommands.getBranch);
    logger.info("************************************************");

    if (Options.prompt && Options.all) {
      const approvedRepos = await GitCommands.checkoutRepoForDevelop();
      const repos = approvedRepos.map((item) => item.folder);
      console.log(repos);

      await GitCommands.forRepos(repos, GitCommands.checkoutDevelop);
    } else {
      await GitCommands.runGitCommand(GitCommands.checkoutDevelop);
    }
    logger.info("************************************************");

    await GitCommands.runGitCommand(GitCommands.getBranch);
  }

  @command("git.merge", "Merge from develop")
  async mergeFromDevelop() {
    await GitCommands.runGitCommand(GitCommands.getBranch);
    logger.info("************************************************");

    await GitCommands.runGitCommand(GitCommands.mergeFromDevelopBranch);
    logger.info("************************************************");

    await GitCommands.runGitCommand(GitCommands.getBranch);
  }

  @command("git.prune", "Prune repositories")
  async prune() {
    await GitCommands.runGitCommand(GitCommands.pruneRepo);
  }

  @command("git.pull", "Pull repositories")
  async pull() {
    await GitCommands.runGitCommand(GitCommands.pullRepo);
  }

  @command("git.status", "Get status")
  async status() {
    await GitCommands.runGitCommand(GitCommands.statusLogOfRepo);
  }

  @command("git.undo", "Undo repositories")
  async undo() {
    const undoChanges = <GitUndoChanges[]>(
      await GitCommands.runGitCommand(GitCommands.getStatusForRepo)
    );

    const pendingChanges = undoChanges.filter((item) => item.status.length > 0);
    if (pendingChanges.length == 0) {
      logger.warn("No changes to undo");
      return;
    }

    Utility.forEachSequential(pendingChanges, async (item) => {
      await undo(item);
    });

    async function undo(changedRepo: GitUndoChanges) {
      logger.warn(
        `Undo ${changedRepo.status.length} changes in ${changedRepo.repo} in ${changedRepo.folder}`
      );
      changedRepo.status.forEach((status) => logger.info(status));
      logger.info("----");

      const proceed = confirm(`Undo changes?`);
      if (proceed) {
        const git = new Git();
        git.undo(changedRepo.folder);
        await git.statusLog(changedRepo.folder);
      }
    }
  }

  private static getAllRepos(folder: string) {
    const git = new Git();
    return git.listRepos(folder);
  }

  private static async runGitCommand<T>(
    action: GitActionCallback
  ): Promise<T[] | T | null> {
    const folder = Options.folder || Deno.cwd();

    if (Options.all) {
      return (await GitCommands.forAllRepos(folder, action)) as T[];
    } else {
      const git = new Git();
      const gitFolder = git.gitFolder(folder);
      if (!gitFolder) {
        logger.error(`No git repository found for ${folder}`);
        return null;
      }

      return (await action(gitFolder)) as T;
    }
  }

  private static async forAllRepos<T>(
    folder: string,
    action: GitActionCallback
  ): Promise<T[]> {
    const repos = GitCommands.getAllRepos(folder);

    if (Options.sequential) {
      return Utility.forEachSequential<string, T>(repos, async (repo) => {
        return (await action(repo)) as T;
      });
    } else {
      const tasks = repos.map((folder) => action(folder));

      return (await Promise.all(tasks)) as T[];
    }
  }

  private static async forRepos<T>(
    repos: string[],
    action: GitActionCallback
  ): Promise<T[]> {
    if (Options.sequential) {
      return Utility.forEachSequential<string, T>(repos, async (repo) => {
        return (await action(repo)) as T;
      });
    } else {
      const tasks = repos.map((folder) => action(folder));

      return (await Promise.all(tasks)) as T[];
    }
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

      if (Options.pull) {
        await git.pull(folder);
      }

      logger.info(`Checked out ${branch} for ${folder}`);
      return;
    }

    if (Options.pull) {
      await git.checkout(info.develop, folder);
      await git.pull(folder);
    }

    await git.createBranch(branch, info.develop, folder);

    logger.highlight(`Branch ${branch} ${folder}`);
  }

  private static async createPullRequest(folder: string) {
    const git = new Git();
    const info = await git.info(folder);
    if (!info) {
      logger.error(`Not a git repository for ${folder}`);
      return;
    }

    if (info.branch == info.develop || info.branch == info.defaultBranch) {
      logger.warn(`${folder} already in target branch: ${info.branch}`);
      return;
    }

    const url = `${Options.projects.git}/repos/${info.repo}/pull-requests?create&sourceBranch=refs/heads/${info.branch}&targetBranch=${info.develop}`;
    console.log(url);

    if (!Options.test || Options.dryRun) {
      Utility.run.runAsync(Options.browser, [url], folder, {
        skipEscape: true,
        skipWait: true,
      });
    }

    logger.highlight(`Create PR ${info.branch} ${folder}`);
  }

  private static async generateGitCloneCommand(folder: string) {
    const git = new Git();
    const info = git.config(folder);
    if (!info) {
      return;
    }

    const url = info.url;
    logger.info(`git clone ${url}`);
  }

  private static async mergeFromDevelopBranch(folder: string) {
    const git = new Git();
    const info = await git.info(folder);
    if (!info) {
      logger.error(`Not a git repository for ${folder}`);
      return;
    }

    logger.highlight(`Merging ${folder} ${info.develop} into ${info.branch}`);

    if (Options.reset) {
      await git.reset();
    }

    await git.mergeFromBranch(`origin/${info.develop}`, folder);
  }

  private static async getBranch(folder: string) {
    const git = new Git();
    const branch = await git.branch(folder);
    const repo = Utility.path.basename(folder);
    logger.highlight(`Branch ${repo.padEnd(40)} ${branch}`);
  }

  private static async getBranchList(folder: string) {
    const git = new Git();
    await git.branchList(folder);
  }

  private static async info(folder: string) {
    const git = new Git();
    return await git.info(folder);
  }

  private static async logInfo(folder: string) {
    const git = new Git();
    const info = await git.info(folder);
    logger.info(folder);
    console.log(info);
  }

  private static async pruneRepo(folder: string) {
    logger.highlight(`prune ${folder}`);

    const git = new Git();
    const config = git.config(folder);
    if (!config) {
      logger.error(`Not a git repository for ${folder}`);
      return;
    }

    await git.prune(folder);

    logger.highlight(`Pruned ${folder}`);
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

  /**
   * Log status of repo
   * @param folder folder
   */
  private static async statusLogOfRepo(folder: string) {
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

  /**
   * Get changed files for repo.  git status -s
   * @param folder folder
   * @returns list of changed files
   */
  private static async getStatusForRepo(folder: string) {
    const git = new Git();
    const config = git.config(folder);
    if (!config) {
      logger.error(`Not a git repository for ${folder}`);
      return;
    }

    const status = await git.status(folder);

    return <GitUndoChanges>{
      repo: config.repo,
      folder: folder,
      status: status.filter((item) => item.trim()),
    };
  }

  private static async checkoutRepoForDevelop() {
    const folder = Options.folder || Deno.cwd();
    const infos = await GitCommands.forAllRepos<Config>(
      folder,
      GitCommands.info
    );
    if (!infos || !infos.length) {
      logger.fatal("No git repositories found");
      return [];
    }

    return infos
      .filter((item) => item.branch != item.develop)
      .filter((info) => {
        const proceed = confirm(
          `${info.folder} on ${info.branch}.  Checkout ${info.develop}?`
        );
        return proceed;
      });
  }
}
