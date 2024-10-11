import Options from "../support/options.ts";
import { DefaultRunOptions, RunOptions } from "../utility/index.ts";
import { logger, Utility } from "../utility/index.ts";

export interface Config {
  branch: string;
  defaultBranch: string;
  develop: string;
  originalDevelop: string;
  folder: string;
  isMainBranch: boolean;
  isSpecialBranch: boolean;
  remotes: string[];
  locals: string[];
  repo: string;
  status: string[];
  url: string;
}

const DefaultConfig: Config = {
  branch: "",
  defaultBranch: "",
  develop: "",
  originalDevelop: "",
  folder: "",
  isMainBranch: false,
  isSpecialBranch: false,
  remotes: [],
  repo: "",
  locals: [],
  status: [],
  url: "",
};

function normalizeBranch(branch: string) {
  return branch.trim().replace("remotes/origin/", "").replace("origin/", "");
}

/**
 * Returns branch name, excluding preceeding asterisk
 * @param branch branch name
 * @returns branch name
 */
function getBranchName(branch: string) {
  const parts = branch.split(" ");
  return parts[parts.length - 1].trim();
}

function isSpecialBranch(branch: string, config: Config | null = null) {
  branch = getBranchName(branch);

  if (
    branch == "HEAD" ||
    branch == "master" ||
    branch == "main" ||
    branch == "develop" ||
    (Options.develop && branch == Options.develop) ||
    (Options.git.develop && branch == Options.git.develop)
  ) {
    return true;
  }

  if (config) {
    return config.develop == branch || config.defaultBranch == branch;
  }

  return false;
}

export class Git {
  config(folder: string) {
    const contents = this.getConfigFile(folder);
    if (!contents) {
      return null;
    }

    const config: Config = Object.assign({}, DefaultConfig);
    if (!config) {
      return null;
    }

    contents.split("\n").forEach((line) => {
      const lineItem = line.trim();
      const urlPrefix = "url = ";
      if (lineItem.startsWith(urlPrefix)) {
        config.url = lineItem.replace("url = ", "").trim();
      }
    });

    if (config.url) {
      const parts = config.url.split("/");
      config.repo = parts[parts.length - 1].replace(".git", "");
    }

    config.isSpecialBranch = isSpecialBranch(config.branch, config);

    return config;
  }

  async branch(folder: string = Deno.cwd()): Promise<string> {
    const config = this.config(folder);
    if (!config) return "";

    const results = await this.runAsync(
      "rev-parse --abbrev-ref HEAD".split(" "),
      folder,
      {
        capture: true,
      }
    );

    return normalizeBranch(results);
  }

  async branchList(folder: string = Deno.cwd()): Promise<string> {
    const config = this.config(folder);
    if (!config) return "";

    logger.highlight(`Repository ${config.repo.padEnd(40)}`);

    const results = await this.runAsync("branch -l".split(" "), folder);

    return normalizeBranch(results);
  }

  async checkout(branch: string, folder: string = Deno.cwd()) {
    const config = await this.config(folder);
    if (!config) return;

    await this.runAsync(`checkout ${branch}`.split(" "), folder);
  }

  async createBranch(
    branch: string,
    target: string,
    folder: string = Deno.cwd()
  ): Promise<void> {
    const config = this.config(folder);
    if (!config) return;

    const results = await this.runAsync(
      `branch ${branch} origin/${target}`.split(" "),
      folder
    );

    if (results != "") {
      logger.error(`Failed to create branch ${branch} in ${folder}`);
      return;
    }

    await this.runAsync(`push -u origin ${branch}`.split(" "), folder);

    await this.checkout(branch, folder);

    await this.updateRemote(folder);
  }

  async defaultBranch(folder: string = Deno.cwd()): Promise<string> {
    const config = this.config(folder);
    if (!config) return "";

    const results = await this.runAsync(
      "symbolic-ref refs/remotes/origin/HEAD --short".split(" "),
      folder,
      {
        capture: true,
      }
    );

    return normalizeBranch(results);
  }

  async fetch(folder: string = Deno.cwd()) {
    await this.runAsync("fetch".split(" "), folder);
  }

  /**
   * Gets all info about repository.
   * NOTE: Do not call any methods that need an info object from within this method.
   * NOTE: Otherwise will lead to infinite recusion.
   */
  async info(folder: string = Deno.cwd()): Promise<Config | null> {
    const config = this.config(folder);
    if (!config) return null;

    if (Options.update) {
      await this.updateRemote(folder);
    }

    config.folder = folder;
    config.branch = await this.branch(folder);
    config.defaultBranch = await this.defaultBranch(folder);
    config.status = await this.status(folder);
    config.develop = config.defaultBranch;
    config.originalDevelop = config.develop;
    config.remotes = await this.remoteBranches(folder);
    const locals = await this.localBranches(folder);
    config.locals = locals.filter((item) => !config.remotes.includes(item));

    let overrodeDevelop = false;

    if (Options.develop && Options.develop != "develop") {
      const developBranch = config.remotes.find(
        (item) => item == Options.develop
      );
      if (developBranch) {
        overrodeDevelop = true;
        config.develop = developBranch;
        logger.warn(`Using ${developBranch} as develop branch`);
      }
    }

    const mainBranches = [
      config.defaultBranch,
      ...Options.git.mainBranches,
      Options.develop || Options.git.develop,
    ];
    const remoteMainBranches = config.remotes.filter((value) =>
      mainBranches.includes(value)
    );
    config.isMainBranch = remoteMainBranches.indexOf(config.branch) != -1;

    if (remoteMainBranches.indexOf(Options.git.develop) != -1) {
      config.originalDevelop = Options.git.develop;
      if (!overrodeDevelop) {
        config.develop = Options.git.develop;
      }
    }

    if (Options.prune) {
      await this.prune_worker(config, folder);
    }

    return config;
  }

  gitFolder(folder: string) {
    while (folder) {
      const config = this.getConfigFile(folder);
      if (config) return folder;

      const previous = folder;
      folder = Utility.path.dirname(folder);
      if (folder == previous) return null;
    }

    return null;
  }

  listRepos(folder: string = Deno.cwd()) {
    return Utility.file
      .listDirectories(folder)
      .filter((item) => this.isRepo(item));
  }

  async merge(branch: string, folder: string = Deno.cwd()) {
    await this.runAsync(`merge ${branch}`.split(" "), folder);
  }

  async mergeFromBranch(branch: string, folder: string = Deno.cwd()) {
    const info = await this.info(folder);
    if (!info) return;

    await this.pull(folder);

    if (normalizeBranch(info.branch) == normalizeBranch(branch)) {
      logger.info(`Pulled ${branch} into ${folder}`);
      return;
    }

    await this.merge(branch, folder);

    logger.info(`Merged ${branch} into ${info.branch} for ${folder}`);
  }

  async localBranches(folder: string = Deno.cwd()): Promise<string[]> {
    const results = await this.runAsync("branch --list".split(" "), folder, {
      capture: true,
    });

    return results
      .split("\n")
      .filter((item) => !item.trim().startsWith("* "))
      .map((item) => normalizeBranch(item));
  }

  async remoteBranches(folder: string = Deno.cwd()): Promise<string[]> {
    const results = await this.runAsync(
      'branch --remotes --list "origin/[^H]*"'.split(" "),
      folder,
      {
        capture: true,
      }
    );
    return results.split("\n").map((item) => normalizeBranch(item));
  }

  async allBranches(folder: string = Deno.cwd()): Promise<string[]> {
    const results = await this.runAsync(
      "branch --all --list".split(" "),
      folder,
      {
        capture: true,
      }
    );

    return results.split("\n").map((item) => item.trim());
  }

  async reset(folder: string = Deno.cwd()) {
    await this.runAsync("reset --hard".split(" "), folder);
  }

  /**
   * Delete a branch both locally and remotely
   */
  async deleteBranch(branch: string, folder: string = Deno.cwd()) {
    const force = Options.force ? " --force" : "";
    await this.runAsync(`branch --delete${force} ${branch}`.split(" "), folder);

    await this.runAsync(`push origin --delete ${branch}`.split(" "), folder);
  }

  async status(folder: string = Deno.cwd()): Promise<string[]> {
    const config = this.config(folder);
    if (!config) return [];

    const results = await this.runAsync("status -s".split(" "), folder, {
      capture: true,
    });

    return results.split("\n").map((item) => item.trim());
  }

  async statusLog(folder: string = Deno.cwd()) {
    const config = this.config(folder);
    if (!config) return [];

    await this.runAsync("status -s".split(" "), folder);
  }

  async sshRemote(info: Config, folder: string = Deno.cwd()): Promise<void> {
    if (!info) return;

    const sshUrl = info.url.replaceAll(
      "https://bitbucket.cotiviti.com/scm/",
      "ssh://git@bitbucket.cotiviti.com:7999/"
    );

    if (sshUrl == info.url) return;

    await this.runAsync(`remote set-url origin ${sshUrl}`.split(" "), folder);
    await this.runAsync(`remote -v`.split(" "), folder);
  }

  async prune(folder: string = Deno.cwd()): Promise<void> {
    const info = await this.info(folder);
    if (!info) return;

    return this.prune_worker(info, folder);
  }

  async prune_worker(info: Config, folder: string = Deno.cwd()): Promise<void> {
    await this.runAsync("remote prune origin".split(" "), folder);

    const mergedResponse = await this.runAsync(
      "branch --merged".split(" "),
      folder,
      {
        capture: true,
      }
    );

    const mergedBranches = mergedResponse
      .split("\n")
      .map((branch) => getBranchName(branch));

    const localBranches = info.locals.filter(
      (branch) => !mergedBranches.includes(branch)
    );

    const deleteBranches = [...mergedBranches, ...localBranches].filter(
      (branch) => {
        return (
          info.branch != branch &&
          !isSpecialBranch(branch, info) &&
          !info.remotes.includes(branch)
        );
      }
    );
    if (!deleteBranches.length) return;
    console.log(info.branch, deleteBranches);

    await this.deleteBranches(deleteBranches, folder);
  }

  async pull(folder: string = Deno.cwd()) {
    await this.runAsync("pull".split(" "), folder);

    if (Options.update) {
      await this.updateRemote(folder);
    }
  }

  async undo(folder: string = Deno.cwd()) {
    await this.runAsync("checkout -- .".split(" "), folder);
    await this.runAsync("clean -fd".split(" "), folder);
  }

  private getConfigFile(folder: string) {
    try {
      const configFilePath = `${folder}/.git/config`;
      const fileInfo = Deno.statSync(configFilePath);
      if (!fileInfo || !fileInfo.isFile) {
        return false;
      }

      return Utility.file.readFile(configFilePath)?.trim();
    } catch {
      return null;
    }
  }

  private async deleteBranches(branches: string[], folder: string) {
    const proceed = confirm(`Delete branches?\n   ${branches.join("\n   ")}

    Delete branches?`);
    if (!proceed) return;

    await Utility.forEachParallel(branches, async (branch) => {
      await this.runAsync(
        `branch --delete --force ${branch}`.split(" "),
        folder
      );
    });
  }

  private isRepo(folder: string): boolean {
    const config = this.config(folder);
    if (!config) return false;

    return config.url?.length > 0;
  }

  private async updateRemote(folder: string): Promise<void> {
    const config = this.config(folder);
    if (!config) return;

    await this.runAsync(`remote update`.split(" "), folder);
  }

  private async runAsync(
    args: string[],
    folder: string,
    runOptions: RunOptions = DefaultRunOptions
  ) {
    const results = await Utility.run.runAsync(Options.git.cmd, args, folder, {
      ...runOptions,
      ...{ verbose: Options.verbose },
    });
    if (results && results.startsWith("ERROR")) {
      logger.error(`git ${args.join(" ")} failed for ${folder}`);
    }
    return results;
  }
}
