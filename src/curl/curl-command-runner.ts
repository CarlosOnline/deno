// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import Token from "../dev/token.ts";
import Options from "../options/options.ts";
import { logger, Utility, Url, UrlInfo } from "../utility/index.ts";
import { FetchResponse } from "../utility/utility.url.ts";
import { CurlFileParser } from "./curl-file-parser.ts";
import { red, green, yellow } from "https://deno.land/std/fmt/colors.ts";
import {
  bold,
  brightGreen,
  brightWhite,
  brightCyan,
} from "https://deno.land/std/fmt/colors.ts";

const OneSecondMs = 1000; // 1 second

export interface CurlTestsEndpoint extends UrlInfo {
  delay: number;
}

export type CurlCommandResult = {
  urlInfo: UrlInfo;
  response: FetchResponse;
  body: any;
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

function tryParse(value: string) {
  try {
    if (value) {
      return JSON.parse(value);
    }
  } catch {
    // ignored
  }
  return null;
}

export class CurlCommandRunner {
  private iteration: number;
  private stats = {
    total: 0,
    success: 0,
    failed: 0,
    consecutiveFailed: 0,
  };
  private consecutiveDelay = 0;

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
      if (!endpoints || !endpoints.length) {
        logger.warn(`No endpoints found in ${filePath}`);
        return;
      }

      const results = await this.runEndpoints(endpoints);
      this.writeResults(results, filePath);

      const updateFilePath = `${Utility.path.getFolder(
        filePath
      )}\\Update\\${Utility.path.getFileName(filePath)}`;
      this.generateUpdateCommand(results, updateFilePath);

      this.displayResults(results);

      const delay = (Options.delay || 0) + this.consecutiveDelay;
      if (delay > 0) {
        await Utility.sleep(delay);
      }
    });
  }

  public async runParallel(fileOrFolderPath: string) {
    const parser = new CurlFileParser();

    const files = Utility.file.isFolder(fileOrFolderPath)
      ? Utility.file.listFiles(fileOrFolderPath)
      : [fileOrFolderPath];

    await Utility.forEachParallel(files, async (filePath) => {
      logger.info(`Running ${filePath}`);
      const endpoints = parser.parseCurlFile(filePath);
      if (!endpoints || !endpoints.length) {
        logger.warn(`No endpoints found in ${filePath}`);
        return;
      }

      const results = await this.runEndpoints(endpoints);
      this.writeResults(results, filePath);

      const updateFilePath = `${Utility.path.getFolder(
        filePath
      )}\\Update\\${Utility.path.getFileName(filePath)}`;
      this.generateUpdateCommand(results, updateFilePath);

      this.displayResults(results);
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
        logger.info(`${endpoint.method} ${endpoint.endpoint}`);
        if (Options.verbose) {
          console.log(endpoint);
        }
      });
    });
  }

  public async update(filePath: string, outputFilePath: string) {
    const parser = new CurlFileParser();

    logger.info(`Processing ${filePath}`);

    const endpoints = parser.parseCurlFile(filePath);
    const results = await this.runEndpoints(endpoints);
    this.writeResults(results, filePath);

    this.generateUpdateCommand(results, outputFilePath);
  }

  private generateUpdateCommand(
    results: CurlCommandResult[],
    outputFilePath: string
  ) {
    if (!Options.update) return;

    const updatedEndpoints = results.map((result) => {
      if (
        result.urlInfo.method != "PUT" ||
        !result.response.ok ||
        !result.response.body?.startsWith("{")
      ) {
        return result.urlInfo;
      }

      if (!result.response.body?.startsWith("{")) return result.urlInfo;

      result.urlInfo.payload = JSON.parse(result.response.body);

      return result.urlInfo;
    });

    const output = this.generateCurlCommandsOutput(updatedEndpoints);

    Utility.path.ensure_directory(Utility.path.getFolder(outputFilePath));
    Utility.file.writeTextFile(outputFilePath, output);
    logger.info(`Generated ${brightGreen(outputFilePath)}`);
  }

  private generateCurlCommandsOutput(endpoints: UrlInfo[]) {
    const results: string[] = [];
    endpoints.forEach((endpoint) => {
      const beginning = [
        `curl -X '${endpoint.method.toUpperCase()}' \\`,
        `'${endpoint.url}' \\`,
      ];

      const headers = [];
      for (const key in endpoint.headers) {
        const value = endpoint.headers[key];
        headers.push(`-H '${key}: ${value}' \\`);
      }

      const payload = !endpoint.payload ? [] : getPayloadJson();

      const command = [...beginning, ...headers, ...payload];
      const output = command
        .map((line, index) => (index == 0 ? line : `  ${line}`))
        .join("\r\n")
        .replace(/\\$/, "");
      results.push(output);

      function getPayloadJson() {
        const json = JSON.stringify(endpoint.payload, null, 2).split("\n");
        return [...json, "'"].map((line, index) =>
          index == 0 ? `-d '${line}` : `  ${line}`
        );
      }
    });

    return results.join("\r\n\r\n\r\n");
  }

  private async runEndpoints(endpoints: UrlInfo[]) {
    if (Options.dryRun) {
      return endpoints.map((endpoint) => {
        return <CurlCommandResult>{
          urlInfo: endpoint,
          response: {
            ok: true,
            status: 200,
            statusText: "OK",
            body: "",
            bodyLength: 0,
            errorMessage: "",
          },
          duration: 0,
          startTime: new Date(),
          endTime: new Date(),
          delay: 0,
          envrionment: "",
        };
      });
    }

    const token = await this.getToken();
    this.iteration++;

    logger.info(
      `${int(this.iteration)} Running endpoints: ${
        endpoints.length
      } ${this.iteration.toLocaleString().padStart(5)} at ` +
        new Date().toLocaleString()
    );

    await this.cacheTokensForEndpoints(endpoints);

    const results = await this.runEndpointsWithTimer(endpoints, token);

    logger.trace("\n");

    return results;
  }

  private async cacheTokensForEndpoints(endpoints: UrlInfo[]) {
    if (Options.parallel) {
      return await Promise.all(
        endpoints.map((endpoint: UrlInfo) => this.cacheToken(endpoint))
      );
    } else {
      return await Utility.forEachSequential(
        endpoints,
        async (endpoint: UrlInfo) => await this.cacheToken(endpoint)
      );
    }
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
    token = await this.getTokenFromEndpoint(endpoint, token);

    this.stats.total++;

    logger.trace(
      `\r${int(this.stats.success)} / ${int(this.stats.total)} / ${int(
        this.stats.failed
      )}                         `
    );

    const results = await Url.fetch(endpoint, token);

    const failed = !results.ok || results.error || !results.status;
    if (failed) {
      if (Options.verbose) {
        console.log(endpoint);
      }
    }

    this.stats.success += !failed ? 1 : 0;
    this.stats.failed += failed ? 1 : 0;
    this.stats.consecutiveFailed = failed
      ? this.stats.consecutiveFailed + 1
      : 0;

    if (!failed) {
      this.consecutiveDelay = 0;
    }

    logger.trace(
      `\r${int(this.stats.success)} / ${int(this.stats.total)} / ${int(
        this.stats.failed
      )}                         `
    );

    if (this.stats.consecutiveFailed % 10 == 0) {
      const additionalDelay = Math.floor(this.stats.consecutiveFailed / 10);
      this.consecutiveDelay = additionalDelay * 60; // delay additional 60 seconds per 10 consecutive failures
    }

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

    const response = <CurlCommandResult>{
      urlInfo: endpoint,
      response: results,
      body: tryParse(results.body as string),
      duration,
      startTime: now,
      endTime: new Date(),
      delay: 0,
      envrionment: "",
    };

    return response;
  }

  private async cacheToken(endpoint: UrlInfo) {
    return await this.getTokenFromEndpoint(endpoint, "");
  }

  private async getTokenFromEndpoint(endpoint: UrlInfo, token: string) {
    // Extract api name from the endpoint
    // http://myname-project.apps.server

    const hostName = endpoint.hostUrl.split(":")[1].trim().replace("//", "");
    if (hostName.indexOf("localhost") >= 0) return token;

    const service = hostName.split("-")[0];

    const hostNamePrefix = hostName.split(".")[0];
    const envParts = hostNamePrefix.split("-");
    const env = envParts[envParts.length - 1];

    // Not uses cached token
    return await this.getTokenWorker(service, Options.env || env);
  }

  private async getToken() {
    return await this.getTokenWorker(Options.service, Options.env);
  }

  private async getTokenWorker(service: string, env: string) {
    if (Options.skipAuth) return "none";
    if (Options.authToken) return Options.authToken;

    const token = await Token.getToken(service, env, false);
    if (!token) {
      logger.fatal(`No token for ${service} - ${env} from ${Options.tokenApi}`);
      throw new Error(
        `No token for ${service} - ${env} from ${Options.tokenApi}`
      );
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

    logger.info(`Generated ${brightGreen(resultsJsonFile)}`);

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

  private responseData(body: string) {
    if (!body) return [];

    try {
      return JSON.parse(body);
    } catch {
      return [];
    }
  }

  private getTotalCount(headers?: Headers) {
    const count = headers?.get("x-pagination");
    if (!count) return 0;

    const json = JSON.parse(count);
    return json.totalCount;
  }

  private displayResults(results: CurlCommandResult[]) {
    const status = (status: number) => {
      if (status >= 200 && status < 300) return green(status.toLocaleString());
      if (status >= 300 && status < 400) return yellow(status.toLocaleString());
      if (status >= 400) return red(status.toLocaleString());
      return status.toLocaleString();
    };

    results.forEach((result) => {
      const totalCount = this.getTotalCount(result.response.headers);

      const body = result.response.body || "";
      const bodyStr =
        Options.verbose || Options.show ? body : body.substring(0, 100);
      const responseData = this.responseData(result.response.body as string);

      const responseDataLength =
        responseData?.length || Object.keys(responseData || {}).length;

      logger.info(
        `${status(result.response.status).padEnd(4)}

        ${result.response.statusText
          .substring(0, 24)
          .padEnd(25)} ${result.urlInfo.method.padEnd(6)}

          ${totalCount.toLocaleString().padEnd(6)}
          ${responseDataLength.toLocaleString().padEnd(5)}

          ${result.urlInfo.hostUrl}/${result.urlInfo.endpoint.padEnd(20)}

        ${bodyStr}

        ${red(result.response.errorMessage?.substring(0, 30) || "")}`
          .replaceAll("\r\n", "")
          .replaceAll("\r", "")
          .replaceAll("\n", "")
      );
    });
  }
}
