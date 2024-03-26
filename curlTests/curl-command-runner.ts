// deno-lint-ignore-file no-explicit-any
import Token from "../dev/token.ts";
import Options from "../support/options.ts";
import { logger, Utility, Url, UrlInfo } from "../utility/index.ts";
import { FetchResponse } from "../utility/utility.url.ts";

const OneSecondMs = 1000; // 1 second

const ResultsFolder = "c:\\temp\\curl";

export interface CurlTestsEndpoint extends UrlInfo {
  delay: number;
}

export type CurlCommandResult = {
  urlInfo: UrlInfo;
  response: FetchResponse;
  duration: number;
  startTime: Date;
  endTime: Date;
  delay: number;
  envrionment: string;
};

function toDurationStringRaw(duration: number) {
  if (duration < OneSecondMs) return duration.toLocaleString() + "  ms";

  return (duration / OneSecondMs).toLocaleString() + " sec";
}

function toDurationString(duration: number) {
  const value = toDurationStringRaw(duration);
  return value.padStart(10, " ");
}

function int(value: number) {
  return value.toLocaleString().padStart(10, " ");
}

export class CurlCommandRunner {
  private iteration: number;
  private stats = {
    total: 0,
    success: 0,
    failed: 0,
  };

  public constructor() {
    this.iteration = 0;
  }

  public async run(filePath: string) {
    const endpoints = this.getCurlCommandsFromFile(filePath)
      .map((command) => this.getCurlInfo(command))
      .filter((item) => item !== null) as UrlInfo[];

    await this.runEndpoints(endpoints);
  }

  private async runEndpoints(endpoints: UrlInfo[]) {
    const token = await this.getToken();
    this.iteration++;

    logger.info(
      `${int(this.iteration)} Running endpoints: ${
        endpoints.length
      } ${this.iteration.toLocaleString().padStart(5)} at ` +
        new Date().toLocaleString()
    );

    if (Options.sequential) {
      const results = await Utility.forEachSequential(
        endpoints,
        async (endpoint: UrlInfo) => await this.timeIt(endpoint, token)
      );
      this.writeResults(results);
    }

    const tasks = endpoints.map((endpoint: UrlInfo) =>
      this.timeIt(endpoint, token)
    );

    const results = await Promise.all(tasks);
    this.writeResults(results);
  }

  private async fetch(endpoint: UrlInfo, token: string) {
    this.stats.total++;

    if (!Options.verbose) {
      logger.trace(
        `\r${int(this.stats.success)} / ${int(this.stats.total)} / ${int(
          this.stats.failed
        )}                         `
      );
    }

    const results = await Url.fetch(endpoint, token);

    const failed = !results.ok || results.error || !results.status;
    if (failed) {
      logger.error(
        `Failed: ${results.status} ${results.statusText} ${endpoint.method} ${endpoint.url} ${results.error}`
      );

      console.log(endpoint);
    }

    this.stats.success += !failed ? 1 : 0;
    this.stats.failed += failed ? 1 : 0;

    logger.trace(
      `\r${int(this.stats.success)} / ${int(this.stats.total)} / ${int(
        this.stats.failed
      )}                         `
    );

    return results;
  }

  private async timeIt(endpoint: UrlInfo, token: string) {
    const now = new Date();
    const start = Date.now();

    const results = await this.fetch(endpoint, token);

    const end = Date.now();
    const duration = end - start; // + MaxDuration;

    if (Options.verbose) {
      logger.info(toDurationString(duration), endpoint.method, endpoint.url);
    }

    return <CurlCommandResult>{
      urlInfo: endpoint,
      response: results,
      duration,
      startTime: now,
      endTime: new Date(),
      delay: 0,
      envrionment: "",
    };
  }

  private async getToken() {
    const service = new Token();
    const tokenData = Options.tokens[Options.tokenApi || "spotcheck-dev"];
    if (!tokenData) {
      logger.fatal(`No token data found for ${Options.tokenApi}`);
      throw new Error(`No token data found for ${Options.tokenApi}`);
    }

    const token = await service.token(tokenData);
    if (!token) {
      logger.fatal(`No token for ${Options.tokenApi}`);
      throw new Error(`No token for ${Options.tokenApi}`);
    }

    return token;
  }

  private getCurlCommandsFromFile(filePath: string) {
    const authHeaderValue = `-H 'Authorization: Bearer *******'`;

    const pattern = /#.+[\r\n]+/;
    return Utility.file
      .readTextFile(filePath)
      .split(pattern)
      .map((section) => {
        const lines = section
          .split("\n")
          .filter((line) => line.trim().length > 0)
          .map((line) => line.trim())
          .map((line) => line.replace(/\\/g, ""))
          .map((line) => line.trim())
          .map((line) =>
            line.replace(/-H 'Authorization: Bearer.*/g, authHeaderValue)
          );
        return lines.join(" ");
      });
  }

  private getCurlInfo(command: string): UrlInfo | null {
    const pattern =
      /curl\s+-X\s+'(?<method>[^']+)'\s+'(?<url>[^']*)'\s*(?<headers>((-H\s+'[^']+')\s*)*\s*)*(-d\s+'(?<payload>.+)')?/;
    const match = command.match(pattern);
    if (match?.groups) {
      const groups = match.groups;

      return Url.parseUrl(
        groups.method,
        groups.url,
        groups.headers,
        groups.payload
      );
    }

    return null;
  }

  private writeResults(results: CurlCommandResult[]) {
    const folder = ResultsFolder;
    Utility.path.ensure_directory(folder);

    const allResultsCsvFilePath = `${folder}\\results.csv`;
    const allResultsCsv = results.map((item) => toCsvLine(item));
    Utility.file.writeTextFile(
      allResultsCsvFilePath,
      allResultsCsv.join("\r\n"),
      {
        append: true,
        create: true,
      }
    );

    function toCsvLine(item: CurlCommandResult): string {
      const startTime = item.startTime.toISOString();
      const endTime = item.endTime.toISOString();
      const parts = [
        "###",
        item.response.status,
        item.response.bodyLength,
        item.urlInfo.method,
        item.delay,
        item.duration,
        startTime,
        endTime,
        item.urlInfo.hostUrl,
        item.urlInfo.endpoint,
        item.response.error?.replace(/,/g, ""),
        item.urlInfo.url.replace(/,/g, ""),
      ];
      return parts.join(",");
    }
  }
}
