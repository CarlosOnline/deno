// deno-lint-ignore-file no-explicit-any ban-unused-ignore

import Options from "../support/options.ts";
import {
  DefaultRunOptions,
  RunOptions,
  logger,
  Utility,
} from "../utility/index.ts";

export class Yarn {
  private async runAsync(
    args: string[],
    folder: string = Deno.cwd(),
    runOptions: RunOptions = {
      ...DefaultRunOptions,
      ...{ verbose: Options.verbose },
      ...{ capture: true },
    }
  ) {
    const results = await Utility.run.runAsync(Options.oc, args, folder, {
      ...runOptions,
      ...{ verbose: Options.verbose },
    });
    if (results && results.startsWith("ERROR")) {
      logger.error(`oc ${args.join(" ")} failed for ${folder}`);
    }
    return results;
  }
}
