import Options from "../support/options.ts";
import { logger } from "../utility/utility.log.ts";
import Utility from "../utility/utility.ts";

export class Sql {
  async exec(sql: string) {
    const server = Options.server || Options.sql.server;
    if (!server) {
      logger.error("Missing sql server name");
      return;
    }

    const database = Options.database || Options.sql.database;
    if (!database) {
      logger.error("Missing sql database name");
      return;
    }

    const queryArg = Utility.file.fileExists(sql) ? "-i" : "-Q";
    const baseArgs =
      `-f 1252 -j -C -u -E -G -S ${server} -d ${database} ${queryArg}`.split(
        " "
      );
    const args = [...baseArgs, `${sql}`];

    const sqlFolder = Utility.path.dirname(Options.sqlcmd.replaceAll('"', ""));
    await Utility.runAsync("sqlcmd.exe", args, sqlFolder, {
      skipEscape: true,
    });
  }
}
