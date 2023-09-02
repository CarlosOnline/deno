import Options from "../support/options.ts";
import { logger } from "../utility/utility.log.ts";
import Utility from "../utility/utility.ts";

export interface Config {
  branch: string;
  defaultBranch: string;
  develop: string;
  folder: string;
  isMainBranch: boolean;
  remotes: string[];
  locals: string[];
  status: string[];
  url: string;
}

const DefaultConfig: Config = {
  branch: "",
  defaultBranch: "",
  develop: "",
  folder: "",
  isMainBranch: false,
  remotes: [],
  locals: [],
  status: [],
  url: "",
};

function normalizeBranch(branch: string) {
  return branch.trim().replace("remotes/origin/", "").replace("origin/", "");
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

    return config;
  }

  async branch(folder: string = Deno.cwd()): Promise<string> {
    const config = this.config(folder);
    if (!config) return "";

    const results = await Utility.runAsync(
      Options.git.cmd,
      "rev-parse --abbrev-ref HEAD".split(" "),
      folder,
      {
        capture: true,
      }
    );

    return normalizeBranch(results);
  }

  async checkout(branch: string, folder: string = Deno.cwd()) {
    const config = await this.config(folder);
    if (!config) return;

    await Utility.runAsync(
      Options.git.cmd,
      `checkout ${branch}`.split(" "),
      folder
    );
  }

  async createBranch(
    branch: string,
    target: string,
    folder: string = Deno.cwd()
  ): Promise<void> {
    const config = this.config(folder);
    if (!config) return;

    const results = await Utility.runAsync(
      Options.git.cmd,
      `branch ${branch} origin/${target}`.split(" "),
      folder
    );

    if (results != "") {
      logger.error(`Failed to create branch ${branch} in ${folder}`);
      return;
    }

    await Utility.runAsync(
      Options.git.cmd,
      `push -u origin ${branch}`.split(" "),
      folder
    );

    await this.updateRemote(folder);
  }

  async defaultBranch(folder: string = Deno.cwd()): Promise<string> {
    const config = this.config(folder);
    if (!config) return "";

    const results = await Utility.runAsync(
      Options.git.cmd,
      "symbolic-ref refs/remotes/origin/HEAD --short".split(" "),
      folder,
      {
        capture: true,
      }
    );

    return normalizeBranch(results);
  }

  async fetch(folder: string = Deno.cwd()) {
    await Utility.runAsync(Options.git.cmd, "fetch".split(" "), folder);
  }

  async info(folder: string = Deno.cwd()): Promise<Config | null> {
    const config = this.config(folder);
    if (!config) return null;

    if (Options.prune) {
      await this.prune(folder);
    } else if (Options.update) {
      await this.updateRemote(folder);
    }

    config.folder = folder;
    config.branch = await this.branch(folder);
    config.defaultBranch = await this.defaultBranch(folder);
    config.status = await this.status(folder);
    config.develop = config.defaultBranch;
    config.remotes = await this.remoteBranches(folder);
    const locals = await this.localBranches(folder);
    config.locals = locals.filter((item) => !config.remotes.includes(item));

    const mainBranches = [config.defaultBranch, ...Options.git.mainBranches];
    const remoteMainBranches = config.remotes.filter((value) =>
      mainBranches.includes(value)
    );
    config.isMainBranch = remoteMainBranches.indexOf(config.branch) != -1;

    if (remoteMainBranches.indexOf(Options.git.develop) != -1) {
      config.develop = Options.git.develop;
    }

    return config;
  }

  listRepos(folder: string = Deno.cwd()) {
    return Utility.file
      .listDirectories(folder)
      .filter((item) => this.isRepo(item));
  }

  async merge(branch: string, folder: string = Deno.cwd()) {
    await Utility.runAsync(
      Options.git.cmd,
      `merge ${branch}`.split(" "),
      folder
    );
  }

  async mergeFromBranch(branch: string, folder: string = Deno.cwd()) {
    const info = await this.info(folder);
    if (!info) return;

    await this.pull(folder);

    if (normalizeBranch(info.branch) == normalizeBranch(branch)) {
      return;
    }

    await this.merge(branch, folder);
  }

  async localBranches(folder: string = Deno.cwd()): Promise<string[]> {
    const results = await Utility.runAsync(
      Options.git.cmd,
      "branch --list".split(" "),
      folder,
      {
        capture: true,
      }
    );
    return results
      .split("\n")
      .filter((item) => !item.trim().startsWith("* "))
      .map((item) => normalizeBranch(item));
  }

  async remoteBranches(folder: string = Deno.cwd()): Promise<string[]> {
    const results = await Utility.runAsync(
      Options.git.cmd,
      'branch --remotes --list "origin/[^H]*"'.split(" "),
      folder,
      {
        capture: true,
      }
    );
    return results.split("\n").map((item) => normalizeBranch(item));
  }

  async allBranches(folder: string = Deno.cwd()): Promise<string[]> {
    const results = await Utility.runAsync(
      Options.git.cmd,
      "branch --all --list".split(" "),
      folder,
      {
        capture: true,
      }
    );

    return results.split("\n").map((item) => item.trim());
  }

  async status(folder: string = Deno.cwd()): Promise<string[]> {
    const config = this.config(folder);
    if (!config) return [];

    const results = await Utility.runAsync(
      Options.git.cmd,
      "status -s".split(" "),
      folder,
      {
        capture: true,
      }
    );

    return results.split("\n").map((item) => item.trim());
  }

  async statusLog(folder: string = Deno.cwd()) {
    const config = this.config(folder);
    if (!config) return [];

    await Utility.runAsync(Options.git.cmd, "status -s".split(" "), folder);
  }

  async prune(folder: string = Deno.cwd()): Promise<void> {
    const config = this.config(folder);
    if (!config) return;

    await Utility.runAsync(
      Options.git.cmd,
      "remote prune origin".split(" "),
      folder
    );
  }

  async pull(folder: string = Deno.cwd()) {
    await Utility.runAsync(Options.git.cmd, "pull".split(" "), folder);

    if (Options.update) {
      await this.updateRemote(folder);
    }
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

  private isRepo(folder: string): boolean {
    const config = this.config(folder);
    if (!config) return false;

    return config.url?.length > 0;
  }

  private async updateRemote(folder: string): Promise<void> {
    const config = this.config(folder);
    if (!config) return;

    await Utility.runAsync(Options.git.cmd, `remote update`.split(" "), folder);
  }
}
