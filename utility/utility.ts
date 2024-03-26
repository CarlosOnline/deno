// deno-lint-ignore-file no-explicit-any
import { OpenOptions, open } from "https://deno.land/x/open/index.ts";
import * as clipboard from "https://deno.land/x/copy_paste@v1.1.3/mod.ts";
import { sleep } from "https://deno.land/x/sleep/mod.ts";

import { File } from "./utility.file.ts";
import { Log } from "./utility.log.ts";
import { Path } from "./utility.path.ts";
import { Run } from "./utility.run.ts";
import { Random } from "./utility.random.ts";
import { Url } from "./utility.url.ts";

export class Utility {
  static file = File;
  static log = Log;
  static path = Path;
  static random = Random;
  static run = Run;
  static url = Url;

  static async forEachParallel<T, TReturn>(
    values: T[],
    func: (item: any) => Promise<TReturn>
  ): Promise<any> {
    return await Promise.all(values.map(async (item: any) => await func(item)));
  }

  static async forEachSequential<T, TReturn>(
    values: T[],
    func: (item: T) => Promise<TReturn>
  ): Promise<TReturn[]> {
    const results: TReturn[] = [];
    for (const item of values) {
      const result = await func(item);
      results.push(result);
    }

    return results;
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
