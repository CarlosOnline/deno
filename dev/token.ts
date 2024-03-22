// deno-lint-ignore-file no-explicit-any
import { TokenData } from "../support/options.ts";
import { logger } from "../utility/index.ts";

export default class Token {
  async token(tokenData: TokenData) {
    const formBody: string[] = [];
    (<string[][]>(tokenData.body as any)).forEach((pair) => {
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
    return token;
  }
}
