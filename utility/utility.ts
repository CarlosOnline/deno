// deno-lint-ignore-file no-explicit-any
import { OpenOptions, open } from "https://deno.land/x/open/index.ts";
import * as clipboard from "https://deno.land/x/copy_paste@v1.1.3/mod.ts";
import { sleep } from "https://deno.land/x/sleep/mod.ts";

import Options from "../support/options.ts";
import File from "./utility.file.ts";
import Log, { logger } from "./utility.log.ts";
import Path from "./utility.path.ts";

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

export default class Utility {
  static file = File;
  static log = Log;
  static path = Path;

  static async forEachParallel<T>(
    values: T[],
    func: (item: any) => Promise<any>
  ): Promise<any> {
    return await Promise.all(values.map(async (item: any) => await func(item)));
  }

  static async forEachSequential<T>(
    values: T[],
    func: (item: any) => Promise<any>
  ): Promise<void> {
    for (const item of values) {
      await func(item);
    }
  }

  static async sleep(seconds: number) {
    await sleep(seconds);
  }

  static async copyTextToClipboard(value: string) {
    await clipboard.writeText(value);
  }

  static async copyToClipboard(value: any) {
    await clipboard.write(value);
  }

  static async openUrl(url: string, options?: OpenOptions) {
    await open(url, options);
  }

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

    const cmdOptions = Utility.getRunOptions(args, folder, runOptions);
    const commander = new Deno.Command(cmd, cmdOptions);

    if (!runOptions.noWait) {
      const results = commander.outputSync();
      return Utility.procesRun(results, runOptions, cmd, args);
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

    const cmdOptions = Utility.getRunOptions(args, folder, runOptions);
    const commander = new Deno.Command(cmd, cmdOptions);

    if (!runOptions.noWait) {
      const results = await commander.output();
      return Utility.procesRun(results, runOptions, cmd, args);
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
