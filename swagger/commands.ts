// deno-lint-ignore-file no-explicit-any
import Options from "../support/options.ts";

import { command } from "../support/index.ts";
import { Swagger } from "./swagger.ts";
import { logger } from "../utility/index.ts";

export default class SwaggerCommands {
  @command("swagger.list", "List all swagger endpoints")
  async listEndpoints() {
    const runner = new Swagger();
    if (Options.args.length < 2) {
      logger.fatal("Missing file path");
    }

    const results = await runner.parse(Options.args[1]);

    if (Options.verbose) {
      console.log(results);
    }

    results
      .map((item: any) => `${item.method.padEnd(10)} ${item.endpoint}`)
      .forEach((item: string) => logger.info(item));
  }

  @command("swagger.versions", "List versioned endpoints")
  async listVersionedEndpoints() {
    const runner = new Swagger();
    if (Options.args.length < 2) {
      logger.fatal("Missing file path");
    }

    const endpoints = await runner.parse(Options.args[1]);
    const groups = runner.groupByCategory(endpoints);
    for (const key in groups) {
      const group = groups[key];
      if (group.length > 1) {
        group
          .map((item: any) => `${item.method.padEnd(10)} ${item.endpoint}`)
          .forEach((item: string) => logger.info(item));
        logger.info("----");
      }
    }
  }
}
