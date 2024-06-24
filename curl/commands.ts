// deno-lint-ignore-file no-explicit-any
import Options from "../support/options.ts";

import { command } from "../support/index.ts";
import { CurlCommandRunner } from "./curl-command-runner.ts";
import { logger } from "../utility/index.ts";

export default class CurlCommands {
  @command("curl.run", "Run curl commands from specified folder or file", [
    "curl.run c:\\Temp\\Api",
    "curl.run c:\\Temp\\Api\\tests.md --authToken *****",
    "curl.run c:\\Temp\\Api\\tests.md --service spotcheck --env uat",
    "curl.run c:\\Temp\\Api\\tests.md --hostUrl=https://my-service.com",
  ])
  async run() {
    const runner = new CurlCommandRunner();
    if (Options.args.length < 2) {
      logger.fatal("Missing file path");
    }

    let repeatCount = Options.repeat != true ? parseInt(Options.repeat) : 0;

    do {
      if (Options.parallel) {
        await runner.runParallel(Options.args[1]);
      } else {
        await runner.run(Options.args[1]);
      }
    } while (Options.repeat && (Options.repeat == true || repeatCount-- > 0));
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
  }

  @command(
    "curl.update",
    "Generate update curl commands from specified folder or file. Use --dryRun to replace [UniqueId] only.",
    [
      "curl.update c:\\Temp\\Api\\tests.md c:\\Temp\\Api\\update.md",
      "curl.update c:\\Temp\\Api\\tests.md c:\\Temp\\Api\\update.md --dryRun",
    ]
  )
  async generateUpdateCommands() {
    const runner = new CurlCommandRunner();
    if (Options.args.length < 3) {
      logger.fatal("Missing input and output file path");
    }

    await runner.update(Options.args[1], Options.args[2]);
  }
}
