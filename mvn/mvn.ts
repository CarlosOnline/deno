import Options from "../support/options.ts";
import { DefaultRunOptions, RunOptions } from "../utility/index.ts";
import { logger } from "../utility/utility.log.ts";
import Utility from "../utility/utility.ts";
import { parse } from "https://deno.land/x/xml/mod.ts";

export interface Config {
  artifactId: string;
  version: string;
  name: string;
  groupId: string;
  modelVersion: string;
  description: string;
  folder: string;
}

const DefaultConfig: Config = {
  artifactId: "",
  folder: "",
  version: "",
  name: "",
  groupId: "",
  modelVersion: "",
  description: "",
};

export class Mvn {
  config(folder: string) {
    const contents = this.getConfigFile(folder);
    if (!contents) {
      return null;
    }

    const config: any = parse(contents);
    if (!config) {
      return null;
    }

    const result: Config = {
      artifactId: config.project.artifactId,
      folder: folder,
      version: config.project.version,
      name: config.project.name,
      groupId: config.project.groupId,
      modelVersion: config.project.modelVersion,
      description: config.project.description,
    };

    return result;
  }

  async maven(folder: string = Deno.cwd(), action: string): Promise<string> {
    const config = this.config(folder);
    if (!config) return "";

    const skipTests = Options.mvn.skipTests ? "-DskipTests" : "";

    const results = await this.runAsync(
      `${action} ${skipTests}`.split(" "),
      folder,
      {
        capture: Options.silent ? true : false,
      }
    );

    return results;
  }

  mvnFolder(folder: string) {
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

  private getConfigFile(folder: string) {
    try {
      const configFilePath = `${folder}/pom.xml`;
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

    return config.artifactId?.length > 0;
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
    const results = await Utility.run.runAsync(
      Options.mvn.cmd,
      args,
      folder,
      runOptions
    );
    if (results && results.startsWith("ERROR")) {
      logger.error(`mvn ${args.join(" ")} failed for ${folder}`);
    }
    return results;
  }
}
