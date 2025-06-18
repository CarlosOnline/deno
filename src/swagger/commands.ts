// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import Options from "../options/options.ts";

import { command } from "../support/index.ts";
import { Swagger } from "./swagger.ts";
import { logger } from "../utility/index.ts";

export default class SwaggerCommands {
  @command("swagger.list", "List all swagger endpoints", [
    "swagger.list ./path/to/swagger.json",
    "swagger.list http://my-service/v3/api-docs",
    "swagger.list my-app", // Looks up url from app configuration
  ])
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
