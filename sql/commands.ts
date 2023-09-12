// deno-lint-ignore-file no-explicit-any

import { action } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger } from "../utility/index.ts";
import Utility from "../utility/utility.ts";
import { Sql } from "./sql.ts";

export default class SqlCommands {
  @action("sql.recreate", "Recreate sql sprocs / views etc")
  async recreateSqlObjects() {
    if (!Options.file && Options.args.length < 2) {
      logger.fatal("Missing file to be processed");
    }

    const filePath = Options.file || Options.args[1];

    const sqlFiles = Utility.file
      .readFile(filePath)
      .split("\n")
      .map((item) => item.trim().replaceAll("\r", ""))
      .filter((item) => item && !item.startsWith("#"));

    await Utility.forEachSequential(sqlFiles, (item) =>
      SqlCommands.executeFile(item)
    );
    console.error("completed");
  }

  private static getSqlType(filePath: string) {
    filePath = filePath.toLocaleLowerCase();
    if (filePath.indexOf("\\stored procedures\\") != -1) {
      return "PROCEDURE";
    } else if (filePath.indexOf("\\views\\") != -1) {
      return "VIEW";
    } else if (filePath.indexOf("\\functions\\") != -1) {
      return "FUNCTION";
    } else if (filePath.indexOf("\\tables\\") != -1) {
      return "TABLE";
    }
  }

  private static getSchema(filePath: string) {
    filePath = filePath.toLocaleLowerCase();
    let idx = filePath.indexOf("\\stored procedures\\");
    if (idx != -1) {
      return Utility.path.basename(filePath.substr(0, idx));
    }

    idx = filePath.indexOf("\\views\\");
    if (idx != -1) {
      return Utility.path.basename(filePath.substr(0, idx));
    }

    idx = filePath.indexOf("\\functions\\");
    if (idx != -1) {
      return Utility.path.basename(filePath.substr(0, idx));
    }

    idx = filePath.indexOf("\\tables\\");
    if (idx != -1) {
      return Utility.path.basename(filePath.substr(0, idx));
    }

    return "dbo";
  }

  private static async executeFile(filePath: string) {
    if (!Utility.file.fileExists(filePath.replaceAll("\\", "/"))) {
      logger.warn(`Missing ${filePath}`);
      return;
    }

    logger.warn(filePath);

    const sqlType = SqlCommands.getSqlType(filePath);
    const name = Utility.path.basename(filePath).replace(".sql", "");
    const schema = SqlCommands.getSchema(filePath);

    const sql = new Sql();

    if (!Options.skipDrop) {
      const query = `DROP ${sqlType} [${schema}].[${name}]`;
      logger.info(query);
      await sql.exec(query);
    }

    logger.info(filePath);
    await sql.exec(filePath);
    logger.info("");
  }
}
