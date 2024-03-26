import Options from "../support/options.ts";
import { logger, Utility } from "../utility/index.ts";

export class Sql {
  private server: string;
  private database: string;
  private username: string;
  private password: string;

  constructor(
    server: string = "",
    database: string = "",
    username: string = "",
    password: string = ""
  ) {
    this.server = server || Options.server || Options.sql.server;
    this.database = database || Options.database || Options.sql.database;
    this.username = username;
    this.password = password;
  }

  async exec(sql: string, capture = false) {
    if (!this.server) {
      logger.error("Missing sql server name");
      return;
    }

    if (!this.database) {
      logger.error("Missing sql database name");
      return;
    }

    /* sqlcmd flags
        [-C Trust Server Certificate]    
        [-G use Azure Active Directory for authentication]
        [-U login id]
        [-P password]
        [-Q "cmdline query" and exit]
        [-f <codepage> | i:<codepage>[,o:<codepage>] ]
        [-i inputfile]
        [-j Print raw error messages]
        [-u unicode output]
    */
    const queryArg = Utility.file.fileExists(sql) ? "-i" : "-Q";
    const loginArgs =
      this.username && this.password
        ? `-U ${this.username} -P ${this.password}`
        : "-E -G";
    const baseArgs =
      `-C -f 1252 -j -u ${loginArgs} -S ${this.server} -d ${this.database} ${queryArg}`.split(
        " "
      );
    const args = [...baseArgs, `${sql}`];

    const sqlFolder = Utility.path.dirname(Options.sqlcmd.replaceAll('"', ""));
    return await Utility.run.runAsync("sqlcmd.exe", args, sqlFolder, {
      skipEscape: true,
      capture: capture,
    });
  }
}
