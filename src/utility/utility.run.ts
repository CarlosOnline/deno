import Options from "../options/options.ts";
import { logger, Utility } from "./index.ts";

export interface RunOptions {
  verbose?: boolean;
  capture?: boolean;
  skipWait?: boolean;
  async?: boolean;
  skipEscape?: boolean;
  skipDiagnostics?: boolean;
}

export const DefaultRunOptions: RunOptions = {
  verbose: false,
  capture: false,
  skipWait: false,
  async: false,
  skipEscape: false,
  skipDiagnostics: false,
};

declare type RunPipe = "inherit" | "piped" | "null" | number;

export class Run {
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

    if (Options.test || Options.dryRun) {
      const exe = Utility.path.basename(cmd);
      logger.info(`${exe} ${args.join(" ")}`);
      return "";
    }

    const cmdOptions = Run.getRunOptions(args, folder, runOptions);
    const commander = new Deno.Command(cmd, cmdOptions);

    if (runOptions.skipWait) {
      Run.runInBackgroundNoWait(commander);
      return "";
    }

    const results = commander.outputSync();
    return Run.extractProcessOutput(results, runOptions, cmd, args);
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

    if (Options.test || Options.dryRun) {
      const exe = Utility.path.basename(cmd);
      logger.info(`${exe} ${args.join(" ")}`);
      return "";
    }

    const cmdOptions = Run.getRunOptions(args, folder, runOptions);
    const commander = new Deno.Command(cmd, cmdOptions);

    if (runOptions.skipWait) {
      Run.runInBackgroundNoWait(commander);
      return "";
    }

    const results = await commander.output();
    return Run.extractProcessOutput(results, runOptions, cmd, args);
  }

  /**
   * Run process in background, Deno doesn't wait for it to finish.
   * See https://github.com/denoland/deno/issues/21446
   * @param commander Deno.Command object
   */
  private static runInBackgroundNoWait(commander: Deno.Command) {
    // Run process in background, Deno doesn't wait for it to finish.
    // TODO: get it to work with Windows, currently it closes the process.
    const _process = commander.spawn();
    setTimeout(() => {
      // TODO: process.unref();
      logger.error(
        "runInBackgroundNoWait: Background process started, exiting Deno."
      );
      Deno.exit(0);
    }, 1500);
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

  private static extractProcessOutput(
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
