import Options from "../support/options.ts";
import Utility from "./utility.ts";
import { logger } from "./utility.log.ts";

export interface RunOptions {
  verbose?: boolean;
  capture?: boolean;
  noWait?: boolean;
  async?: boolean;
  skipEscape?: boolean;
  skipDiagnostics?: boolean;
}

export const DefaultRunOptions: RunOptions = {
  verbose: false,
  capture: false,
  noWait: false,
  async: false,
  skipEscape: false,
  skipDiagnostics: false,
};

declare type RunPipe = "inherit" | "piped" | "null" | number;

export default class Run {
  static run(
    cmd: string,
    args: string[],
    folder = "",
    runOptions: RunOptions = DefaultRunOptions
  ): string {
    if (runOptions.verbose || Options.verbose) {
      const exe = Utility.path.basename(cmd);
      logger.info(`${exe} ${args.join(" ")}`);
    }

    if (Options.test) {
      const exe = Utility.path.basename(cmd);
      logger.info(`${exe} ${args.join(" ")}`);
      return "";
    }

    const cmdOptions = Run.getRunOptions(args, folder, runOptions);
    const commander = new Deno.Command(cmd, cmdOptions);

    if (!runOptions.noWait) {
      const results = commander.outputSync();
      return Run.procesRun(results, runOptions, cmd, args);
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
    if (runOptions.verbose || Options.verbose) {
      const exe = Utility.path.basename(cmd.replaceAll('"', ""));
      logger.info(`${exe} ${args.join(" ")}`);
    }

    if (Options.test) {
      const exe = Utility.path.basename(cmd);
      logger.info(`${exe} ${args.join(" ")}`);
      return "";
    }

    const cmdOptions = Run.getRunOptions(args, folder, runOptions);
    const commander = new Deno.Command(cmd, cmdOptions);

    if (!runOptions.noWait) {
      const results = await commander.output();
      return Run.procesRun(results, runOptions, cmd, args);
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
      windowsRawArguments: runOptions.skipEscape ? false : true,
    };

    if (runOptions.capture) {
      options.stdout = "piped";
      options.stderr = "piped";
    }

    return options;
  }

  private static procesRun(
    results: Deno.CommandOutput,
    runOptions: RunOptions,
    cmd: string,
    args: string[]
  ) {
    let stdout = "";
    let stderr = "";

    if (runOptions.capture) {
      const decoder = new TextDecoder();
      stdout = decoder.decode(results.stdout).trim();
      stderr = decoder.decode(results.stderr).trim();
    }

    if (!results.success || results.code != 0) {
      if (!runOptions.skipDiagnostics || Options.debug) {
        const exe = Utility.path.basename(cmd);
        logger.error(
          `ERROR ${results.code} ${exe} ${args.join(" ")}\r\n${stderr}`
        );
      }
      return `ERROR: ${stderr}`;
    }

    return stdout;
  }
}
