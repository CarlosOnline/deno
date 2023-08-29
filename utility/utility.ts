import File from "./utility.file.ts";
import Log from "./utility.log.ts";
import Path from "./utility.path.ts";

export interface RunOptions {
  verbose?: boolean;
  capture?: boolean;
  noWait?: boolean;
  async?: boolean;
}

export const DefaultRunOptions: RunOptions = {
  verbose: false,
  capture: false,
  noWait: false,
  async: false,
};

declare type RunPipe = "inherit" | "piped" | "null" | number;

export default class Utility {
  static file = File;
  static log = Log;
  static path = Path;

  static run(
    cmd: string,
    args: string[],
    folder = "",
    runOptions: RunOptions = DefaultRunOptions
  ): string {
    const cmdOptions = Utility.getRunOptions(args, folder, runOptions);
    const commander = new Deno.Command(cmd, cmdOptions);

    if (!runOptions.noWait) {
      const results = commander.outputSync();
      return Utility.procesRun(results, runOptions);
    } else {
      return "";
    }
  }

  static async runAsync(
    cmd: string,
    args: string[],
    folder = "",
    runOptions: RunOptions = DefaultRunOptions
  ): Promise<string> {
    const cmdOptions = Utility.getRunOptions(args, folder, runOptions);
    const commander = new Deno.Command(cmd, cmdOptions);

    if (!runOptions.noWait) {
      const results = await commander.output();
      return Utility.procesRun(results, runOptions);
    } else {
      return "";
    }
  }

  private static getRunOptions(
    args: string[],
    folder = "",
    runOptions: RunOptions
  ) {
    let stdout: RunPipe = "inherit";
    let stderr: RunPipe = "inherit";

    if (runOptions.capture) {
      stdout = "piped";
      stderr = "piped";
    }

    const options: Deno.CommandOptions = {
      args: args,
      stdout: stdout,
      stderr: stderr,
      cwd: folder,
    };

    if (runOptions.capture) {
      options.stdout = "piped";
      options.stderr = "piped";
    }

    return options;
  }

  private static procesRun(
    results: Deno.CommandOutput,
    runOptions: RunOptions
  ) {
    let stdout = "";
    let stderr = "";

    if (runOptions.capture) {
      const decoder = new TextDecoder();
      stdout = decoder.decode(results.stdout).trim();
      stderr = decoder.decode(results.stderr).trim();
    }

    if (!results.success || results.code != 0) {
      return `ERROR: ${stderr}`;
    }

    return stdout;
  }
}
