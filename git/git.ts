import Options from "../support/options.ts";
import Utility from "../utility/utility.ts";

export interface Config {
  branch: string;
  defaultBranch: string;
  develop: string;
  folder: string;
  isMainBranch: boolean;
  remotes: string[];
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
  status: [],
  url: "",
};

export class Git {
  async branch(folder: string = Deno.cwd()): Promise<string> {
    const config = this.config(folder);
    if (!config) return "";

    return await Utility.runAsync(
      Options.git.cmd,
      "rev-parse --abbrev-ref HEAD".split(" "),
      folder,
      {
        capture: true,
      }
    );
  }

  async checkout(branch: string, folder: string = Deno.cwd()) {
    const info = await this.info(folder);
    if (!info) return;

    await Utility.runAsync(
      Options.git.cmd,
      `checkout ${branch}`.split(" "),
      folder
    );
  }

  config(folder: string = Deno.cwd()) {
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

  async defaultBranch(folder: string = Deno.cwd()): Promise<string> {
    const config = this.config(folder);
    if (!config) return "";

    const remoteInfo = await Utility.runAsync(
      Options.git.cmd,
      "remote show origin".split(" "),
      folder,
      {
        capture: true,
      }
    );

    const headBranchLine = remoteInfo
      .split("\n")
      .find((line) => line.trim().startsWith("HEAD branch:"));
    if (!headBranchLine) {
      return "";
    }

    return headBranchLine.replace("HEAD branch:", "").trim();
  }

  async info(folder: string = Deno.cwd()): Promise<Config | null> {
    const config = this.config(folder);
    if (!config) return null;

    config.folder = folder;
    config.branch = await this.branch(folder);
    config.defaultBranch = await this.defaultBranch(folder);
    config.develop = config.defaultBranch;
    config.remotes = await this.remoteBranches(folder);
    config.status = await this.status(folder);

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

  isRepo(folder: string = Deno.cwd()): boolean {
    const config = this.config(folder);
    if (!config) return false;

    return config.url?.length > 0;
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

    if (info.branch == branch) {
      return;
    }

    await this.merge(branch, folder);
  }

  async remoteBranches(folder: string = Deno.cwd()): Promise<string[]> {
    const results = await Utility.runAsync(
      Options.git.cmd,
      'branch -r --list "origin/[^H]*"'.split(" "),
      folder,
      {
        capture: true,
      }
    );
    return results
      .split("\n")
      .map((item) => item.trim().replace("origin/", ""));
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

  async pull(folder: string = Deno.cwd()) {
    await Utility.runAsync(Options.git.cmd, "pull".split(" "), folder);
  }

  private getConfigFile(folder: string = Deno.cwd()) {
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
}
