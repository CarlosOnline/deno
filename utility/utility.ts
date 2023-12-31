// deno-lint-ignore-file no-explicit-any
import { OpenOptions, open } from "https://deno.land/x/open/index.ts";
import * as clipboard from "https://deno.land/x/copy_paste@v1.1.3/mod.ts";
import { sleep } from "https://deno.land/x/sleep/mod.ts";

import File from "./utility.file.ts";
import Log from "./utility.log.ts";
import Path from "./utility.path.ts";
import Run from "./utility.run.ts";

export default class Utility {
  static file = File;
  static log = Log;
  static path = Path;
  static run = Run;

  static async forEachParallel<T, TReturn>(
    values: T[],
    func: (item: any) => Promise<TReturn>
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
}
