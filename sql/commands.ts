// deno-lint-ignore-file no-explicit-any

import { command } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger, Utility } from "../utility/index.ts";
import { Sql } from "./sql.ts";

export default class SqlCommands {
  @command("sql.recreate", "Recreate sql sprocs / views etc", [
    "sql.recreate C:\\Temp\\SQL\\recreate.ref.txt --server USNDCCHSQLD06.ccaintranet.com\\DEV01 --database ARKRef",
  ])
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
