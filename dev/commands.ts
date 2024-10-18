// deno-lint-ignore-file no-explicit-any

import { command } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger, Utility } from "../utility/index.ts";
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

    const token = await Token.getToken(service, env);
    if (!token) {
      logger.fatal("Failed to get token");
      return;
    }
    logger.info(token);

    await Utility.copyTextToClipboard(token);

    return token;
  }
}
