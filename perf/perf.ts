// deno-lint-ignore-file no-explicit-any
import Token from "../dev/token.ts";
import Options from "../support/options.ts";
import { logger } from "../utility/index.ts";
import Utility from "../utility/utility.ts";

const OneMinuteMs = 1000 * 60; // 1 minute
const MaxDurationMinutes = 20;
const MaxDuration = OneMinuteMs * MaxDurationMinutes;

type PerfEndpoint = {
  title: string;
  url: string;
  method: string;
  payload: any;
};

function toDurationStringRaw(duration: number) {
  if (duration < OneMinuteMs) return duration.toLocaleString() + " ms";

  return (duration / OneMinuteMs).toLocaleString() + " min";
}

function toDurationString(duration: number) {
  const value = toDurationStringRaw(duration);
  return value.padEnd(10, " ");
}

export class Perf {
  public async getToken() {
    const service = new Token();
    const tokenData = Options.tokens[Options.perf.token];
    const token = await service.token(tokenData);
    return token;
  }

  public async loop(interval: number) {
    logger.info(
      `Running perf tests every ${interval} minutes ${(
        interval * 60
      ).toLocaleString()} seconds`
    );

    while (true) {
      await this.runAll();
      console.log("...");
      await Utility.sleep(interval * 60);
    }
  }

  public async runAll() {
    logger.info("Starting perf tests at " + new Date().toLocaleString());
    const token = await this.getToken();

    const tasks = Options.perf.endpoints.map((endpoint: PerfEndpoint) =>
      this.timeIt(endpoint, token)
    );

    const results = await Promise.all(tasks);

    this.writePerResults(results);
  }

  private writePerResults(results: any[]) {
    const folder = "c:\\temp\\perf";
    Utility.path.ensure_directory(folder);

    const allResultsCsvFilePath = `${folder}\\perf.csv`;
    const allResultsCsv = results.map((item) => toCsvLine(item));
    Deno.writeTextFile(allResultsCsvFilePath, allResultsCsv.join("\n"), {
      append: true,
      create: true,
    });

    results.forEach((item) => {
      const csvFileName = item.title.replace(
        /[\\\.\+\*\?\^\$\[\]\(\)\{\}\/\'\#\:\!\=\|]/gi,
        "-"
      );
      const csvFilePath = `${folder}\\${csvFileName}.csv`;

      const line = toCsvLine(item);
      Deno.writeTextFile(csvFilePath, line + "\r\n", {
        append: true,
        create: true,
      });
    });

    function toCsvLine(item: any): string {
      return `${item.method},${
        item.duration
      },${item.start.toISOString()},${item.end.toISOString()},${item.url},${
        item.error
      }`;
    }
  }

  private async fetch(
    url: string,
    token: string,
    method = "GET",
    payload: any = null
  ) {
    const params = {
      method: method,
      headers: {
        "Content-Type": payload ? "application/json" : "",
        Authorization: `Bearer ${token}`,
      },
      body: payload ? JSON.stringify(payload) : undefined,
    };
    try {
      await fetch(url, params);
      const resp = await fetch(url, params);

      if (!resp.ok) {
        logger.error(
          `Fetch failed ${resp.status} ${resp.statusText} for ${url}`
        );
        return null;
      }

      const body = await resp.json();
      return body;
    } catch (error) {
      logger.error(`Fetch failed ${error} for ${url}`);
      return {
        error: "Error: " + error,
      };
    }
  }

  private async timeIt<T>(endpoint: PerfEndpoint, token: string) {
    const now = new Date();
    const start = Date.now();

    const results: any = await this.fetch(
      endpoint.url,
      token,
      endpoint.method,
      endpoint.payload
    );

    const end = Date.now();
    const duration = end - start; // + MaxDuration;
    logger.info(toDurationString(duration), endpoint.method, endpoint.url);

    if (duration > MaxDuration) {
      logger.error(
        `${now.toLocaleString()}      : Duration ${toDurationString(
          duration
        )} exceeds max duration ${MaxDurationMinutes} for ${endpoint.method} ${
          endpoint.url
        }`
      );
    }
    const error = results?.error ? results.error : null;

    return {
      method: endpoint.method,
      title: endpoint.title,
      url: endpoint.url,
      duration,
      start: now,
      end: new Date(),
      error: error,
    };
  }
}
