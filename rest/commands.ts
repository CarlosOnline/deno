import Options from "../support/options.ts";

export default class RestCommands {
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
    console.log(token);

    if (Options.token.outputFilePath) {
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      Deno.writeFileSync(Options.token.outputFilePath, data);
      console.log();
      console.log(`Generated ${Options.token.outputFilePath}`);
    }

    return token;
  }
}
