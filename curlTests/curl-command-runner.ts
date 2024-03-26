// deno-lint-ignore-file no-explicit-any
import Token from "../dev/token.ts";
import Options from "../support/options.ts";
import { logger, Utility, Url, UrlInfo } from "../utility/index.ts";
import { FetchResponse } from "../utility/utility.url.ts";
import { CurlFileParser } from "./curl-file-parser.ts";

const OneSecondMs = 1000; // 1 second

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

  public async run(fileOrFolderPath: string) {
    const parser = new CurlFileParser();

    const files = Utility.file.isFolder(fileOrFolderPath)
      ? Utility.file.listFiles(fileOrFolderPath)
      : [fileOrFolderPath];

    await Utility.forEachSequential(files, async (filePath) => {
      logger.info(`Running ${filePath}`);
      const endpoints = parser.parseCurlFile(filePath);
      const results = await this.runEndpoints(endpoints);
      logger.trace("\n");
      this.writeResults(results, filePath);
    });
  }

  public list(fileOrFolderPath: string) {
    const files = Utility.file.isFolder(fileOrFolderPath)
      ? Utility.file.listFiles(fileOrFolderPath)
      : [fileOrFolderPath];

    const parser = new CurlFileParser();
    files.forEach((filePath) => {
      logger.info(`Processing ${filePath}`);
      const endpoints = parser.parseCurlFile(filePath);

      endpoints.forEach((endpoint) => {
        console.log(`${endpoint.method} ${endpoint.endpoint}`);
      });
    });
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

    return await this.runEndpointsWithTimer(endpoints, token);
  }

  private async runEndpointsWithTimer(endpoints: UrlInfo[], token: string) {
    if (Options.parallel) {
      return await Promise.all(
        endpoints.map((endpoint: UrlInfo) => this.timeIt(endpoint, token))
      );
    } else {
      return await Utility.forEachSequential(
        endpoints,
        async (endpoint: UrlInfo) => await this.timeIt(endpoint, token)
      );
    }
  }

  private async fetch(endpoint: UrlInfo, token: string) {
    this.stats.total++;

    logger.trace(
      `\r${int(this.stats.success)} / ${int(this.stats.total)} / ${int(
        this.stats.failed
      )}                         `
    );

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

  private writeResults(results: CurlCommandResult[], sourceFilePath: string) {
    const folder = Utility.path.getFolder(sourceFilePath) + "\\results";
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

    const resultsFileName = Utility.path.getFileName(sourceFilePath);
    const resultsJsonFile = `${folder}\\${resultsFileName}.json`;

    Utility.file.writeTextFile(
      resultsJsonFile,
      JSON.stringify(results, null, 3)
    );

    logger.info(`Generated ${resultsJsonFile}`);

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
