import { command } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger, Utility } from "../utility/index.ts";
import Token from "./token.ts";

export default class DevCommands {
  @command("deploy", "Deploy to dev", [
    "deploy https://artifactory-wdc.company.com/artifactory/rca-ce-helm/XXXX-api/XXX-api-2.1.7-beta.40.tgz",
  ])
  async deploy() {
    if (!Options.url && Options.args.length < 2) {
      logger.fatal("Missing download Uri");
    }

    const url: string = Options.url || Options.args[1];

    const rex = new RegExp(
      `https:\/\/artifactory-wdc.[a-z]+.com\/artifactory\/rca-ce-helm\/(?<api>[^/]+)\/(?<api2>.+)-.*.tgz`
    );
    const match = url.match(rex);
    if (!match?.groups) {
      logger.warn("Failed to match download uri pattern");
      return;
    }

    const api = match.groups.api;
    const api2 = match.groups.api2;

    if (api != api2) {
      logger.warn(`api name mismatch: ${api} != ${api2}`);
    }

    logger.warn(`Deploying ${api}`);

    const commandLine = `helm upgrade -i --set profile=dev ${api} ${url}`;
    logger.info(commandLine);

    const proceed = confirm(`Deploy to ${api}?`);
    if (proceed) {
      await Utility.run.runAsync(
        Utility.path.basename(Options.helm),
        `upgrade -i --set profile=dev ${api} ${url}`.split(" "),
        Utility.path.dirname(Options.helm),
        {
          skipEscape: true,
        }
      );
    }
  }

  @command("token", "Get authorization token", [
    "token",
    "token api-name environment",
    "token spotcheck-UAT",
    "token reference UAT",
  ])
  async getToken() {
    const key = DevCommands.getTokenKey();

    const tokenData = DevCommands.getTokenData(key);
    if (tokenData == null) {
      logger.fatal(`Missing token data for ${Options.key}`);
      return;
    }

    const service = new Token();
    const token = await service.token(tokenData);

    logger.info(token);

    await Utility.copyTextToClipboard(token);

    if (tokenData.outputFilePath) {
      Utility.file.writeTextFile(tokenData.outputFilePath, token);
      logger.info(`Generated ${tokenData.outputFilePath}`);
    }

    return token;
  }

  @command("test", "test")
  testMethod() {
    logger.info("Test method called");
  }

  private static getTokenData(key = "") {
    if (!key) {
      return Options.token;
    }

    return Options.tokens[key] || null;
  }

  private static getTokenKey() {
    if (Options.key) {
      return Options.key;
    }

    if (Options.args.length == 2) {
      return Options.args[1].toLocaleLowerCase();
    }

    if (Options.args.length == 3) {
      return `${Options.args[1]}-${Options.args[2]}`.toLocaleLowerCase();
    }

    return "";
  }
}
