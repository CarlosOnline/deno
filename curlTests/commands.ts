// deno-lint-ignore-file no-explicit-any
import Options from "../support/options.ts";

import { command } from "../support/index.ts";
import { CurlCommandRunner } from "./curl-command-runner.ts";
import { logger } from "../utility/index.ts";

export default class CurlCommands {
  @command("curl.run", "Run curl commands from specified folder or file", [
    "curl.run c:\\Temp\\Api",
    "curl.run c:\\Temp\\Api\\tests.md",
    "curl.run c:\\Temp\\Api\\tests.md --hostUrl=https://my-service.com",
  ])
  async run() {
    const runner = new CurlCommandRunner();
    if (Options.args.length < 2) {
      logger.fatal("Missing file path");
    }

    await runner.run(Options.args[1]);

    console.log("completed");
  }

  @command("curl.list", "List curl commands from specified folder or file", [
    "curl.list c:\\Temp\\Api\\tests.md",
  ])
  async listCommands() {
    const runner = new CurlCommandRunner();
    if (Options.args.length < 2) {
      logger.fatal("Missing file path");
    }

    await runner.list(Options.args[1]);

    console.log("completed");
  }
}
