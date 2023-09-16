import { action } from "../support/index.ts";
import Options from "../support/options.ts";
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

  @action("token", "Get authorization token")
  async getToken() {
    const formBody: string[] = [];
    (<string[][]>Options.token.body).forEach((pair) => {
      const encodedKey = encodeURIComponent(pair[0]);
      const encodedValue = encodeURIComponent(pair[1]);
      formBody.push(encodedKey + "=" + encodedValue);
    });

    const formBodyJson = formBody.join("&");
    const resp = await fetch(Options.token.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBodyJson,
    });

    if (!resp.ok) {
      console.error(
        `Fetch token failed ${resp.status} ${resp.statusText} for ${Options.token.url}`
      );
      return null;
    }

    const body = await resp.json();
    const token = body.access_token;
    logger.info(token);

    await Utility.copyTextToClipboard(token);

    if (Options.token.outputFilePath) {
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      Deno.writeFileSync(Options.token.outputFilePath, data);
      logger.info();
      logger.info(`Generated ${Options.token.outputFilePath}`);
    }

    return token;
  }

  @action("test", "test")
  testMethod() {
    logger.info("Test method called");
  }
}
