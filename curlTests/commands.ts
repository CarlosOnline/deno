// deno-lint-ignore-file no-explicit-any
import Options from "../support/options.ts";

import { command } from "../support/index.ts";
import { CurlCommandRunner } from "./curl-command-runner.ts";
import { logger } from "../utility/index.ts";

export default class CurlCommands {
  @command("curl.test", "Test curlTests", ["curl.test c:\\Temp\\curlTests.md"])
  async test() {
    const runner = new CurlCommandRunner();
    if (Options.args.length < 2) {
      logger.fatal("Missing file path");
    }

    await runner.run(Options.args[1]);

    console.log("completed");
  }
}
