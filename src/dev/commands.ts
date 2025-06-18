// deno-lint-ignore-file no-explicit-any ban-unused-ignore

import { command } from "../support/index.ts";
import Options from "../options/options.ts";
import { logger, Utility } from "../utility/index.ts";
import { Csv } from "./csv.ts";
import Token from "./token.ts";

export default class DevCommands {
  @command("options", "Display options")
  dumpOptions() {
    console.log(Options);
  }

  @command("token", "Get authorization token", [
    "token",
    "token api-name environment",
    "token spotcheck UAT",
    "token reference dev",
  ])
  async getToken() {
    const service =
      Options.args.length >= 2 ? Options.args[1].toLocaleLowerCase() : "";
    const env =
      Options.args.length >= 3 ? Options.args[2].toLocaleLowerCase() : "";

    const token = await Token.getToken(service, env, Options.force);
    if (!token) {
      logger.fatal("Failed to get token");
      return;
    }
    logger.info(token);

    await Utility.copyTextToClipboard(token);

    return token;
  }

  @command("csv-to-json", "Convert CSV to JSON")
  convertCsvToJson() {
    if (Options.args.length < 2) {
      logger.fatal("Missing CSV file path");
      return;
    }

    const filePath = Options.args[1];

    const csv = new Csv();
    const data = csv.parseCsv(filePath);

    const outputFilePath = filePath.replace(".csv", ".json");
    const json = JSON.stringify(data, null, 3);
    Utility.file.writeTextFile(outputFilePath, json);
    logger.info(`Generated ${outputFilePath}`);
  }
}
