import { action } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger } from "../utility/index.ts";
import Utility from "../utility/utility.ts";

export default class RestCommands {
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
