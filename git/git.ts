import Options from "../support/options.ts";
import Utility from "../utility/utility.ts";

export interface Config {
  url: string;
}

const DefaultConfig: Config = {
  url: "",
};

export class Git {
  async branch(folder: string = Deno.cwd()): Promise<string> {
    const config = this.config(folder);
    if (!config) return "";

    return await Utility.run(
      Options.git,
      "rev-parse --abbrev-ref HEAD".split(" "),
      folder,
      {
        capture: true,
      }
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

  isRepo(folder: string = Deno.cwd()): boolean {
    const config = this.config(folder);
    if (!config) return false;

    return config.url?.length > 0;
  }

  async status(folder: string = Deno.cwd()): Promise<string> {
    const config = this.config(folder);
    if (!config) return "";

    return await Utility.run(Options.git, "status -s".split(" "), folder, {
      capture: true,
    });
  }

  private getConfigFile(folder: string = Deno.cwd()) {
    const configFilePath = `${folder}/.git/config`;
    const fileInfo = Deno.statSync(configFilePath);
    if (!fileInfo || !fileInfo.isFile) {
      return false;
    }

    return Utility.file.readFile(configFilePath)?.trim();
  }
}
