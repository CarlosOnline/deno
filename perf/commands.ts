// deno-lint-ignore-file no-explicit-any
import Options from "../support/options.ts";

import { command } from "../support/index.ts";
import { Perf, PerfResult } from "./perf.ts";

import { PerfCsvParser } from "./perf-csv-parser.ts";
import Utility from "../utility/utility.ts";
import { logger } from "../utility/utility.log.ts";

export default class PerfCommands {
  @command("perf.test", "Test perf")
  async test() {
    const service = new Perf();
    await service.test();
    console.log("completed");
  }

  @command("perf.loop", "Perf loop")
  async prefLoop() {
    const service = new Perf();
    await service.loop(Options.interval || 5);
    console.log("completed");
  }

  @command("perf.parse", "Parse perf csv")
  parseCsv() {
    const service = new PerfCsvParser();

    const csvFilePath = Options.csv || "c:\\temp\\perf\\perf.csv";
    const outputFilePath = Options.output || "c:\\temp\\perf\\perf.json";

    const results = <PerfResult[]>(<any>service.parseCsv(csvFilePath));
    const json = JSON.stringify(
      results.filter((item) => item.url),
      null,
      3
    )
      .replace(/\\r/g, "")
      .replace(/"null"/g, "null")
      .replace(/"undefined"/g, "null")
      .replace(/"NaN"/g, "null")
      .replace(/"Infinity"/g, "null")
      .replace(/"-Infinity"/g, "null")
      .replace(/""/g, "null");

    Utility.file.writeTextFile(outputFilePath, json);
    logger.info(
      `Parsed ${results.length} rows to ${csvFilePath} to ${outputFilePath}`
    );
  }
}
