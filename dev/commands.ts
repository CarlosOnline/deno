import { action } from "../support/index.ts";
import Options, { TokenData } from "../support/options.ts";
import { logger } from "../utility/index.ts";
import Utility from "../utility/utility.ts";

export default class DevCommands {
  @action("deploy", "Deploy to dev", [
    "deploy https://artifactory-wdc.company.com/artifactory/rca-ce-helm/XXXX-api/XXX-api-2.1.7-beta.40.tgz",
  ])
  async deploy() {
    if (!Options.url && Options.args.length < 2) {
      logger.fatal("Missing download Uri");
    }

    const url: string = Options.url || Options.args[1];

    const rex = new RegExp(
      `https:\/\/artifactory-wdc.[a-z]+.com\/artifactory\/rca-ce-helm\/(?<api>[a-z-]+)\/(?<api2>[a-z0-9-]+)-(?<version>[0-9]+.[0-9]+.[0-9]+)-(?<kind>[a-z]+).(?<revision>[0-9]+).tgz`
    );
    const match = url.match(rex);
    if (!match?.groups) {
      logger.error("Failed to match download uri pattern");
      return;
    }

    const api = match.groups.api;
    const api2 = match.groups.api2;

    if (api != api2) {
      logger.error(`api name mismatch: ${api} != ${api2}`);
      return;
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

  @action("token", "Get authorization token", [
    "token",
    "token api-name environment",
    "token reference UAT",
  ])
  async getToken() {
    const key = DevCommands.getTokenKey();

    const tokenData = DevCommands.getTokenData(key);
    if (tokenData == null) {
      logger.fatal(`Missing token data for ${Options.key}`);
      return;
    }

    const formBody: string[] = [];
    (<string[][]>tokenData.body).forEach((pair) => {
      const encodedKey = encodeURIComponent(pair[0]);
      const encodedValue = encodeURIComponent(pair[1]);
      formBody.push(encodedKey + "=" + encodedValue);
    });

    const formBodyJson = formBody.join("&");
    const resp = await fetch(tokenData.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBodyJson,
    });

    if (!resp.ok) {
      logger.error(
        `Fetch token failed ${resp.status} ${resp.statusText} for ${tokenData.url}`
      );
      return null;
    }

    const body = await resp.json();
    const token = body.access_token;
    logger.info(token);

    await Utility.copyTextToClipboard(token);

    if (tokenData.outputFilePath) {
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      Deno.writeFileSync(tokenData.outputFilePath, data);
      logger.info();
      logger.info(`Generated ${tokenData.outputFilePath}`);
    }

    return token;
  }

  @action("test", "test")
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

    if (Options.args.length < 3) {
      return "";
    }

    return `${Options.args[1]}-${Options.args[2]}`.toLocaleLowerCase();
  }
}
