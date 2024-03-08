// deno-lint-ignore-file no-explicit-any
import Token from "../dev/token.ts";
import { Sql } from "../sql/sql.ts";
import Options from "../support/options.ts";
import { logger } from "../utility/index.ts";
import Utility from "../utility/utility.ts";

const OneSecondMs = 1000; // 1 second
const MaxDurationSeconds = 30;
const MaxDuration = MaxDurationSeconds * OneSecondMs;

type PerfEndpoint = {
  url: string;
  method: string;
  payload: any;
  delay: number;
};

type FetchResponse = {
  status: number;
  statusText: string;
  error: string | null;
  body: string | null;
  bodyLength: number | undefined;
};

export type PerfResult = {
  status: number;
  method: string;
  endpoint: string;
  url: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  error: string;
  delay: number;
  bodyLength: number | undefined;
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

function getEndpoint(url: string) {
  const parts = url.split("?")[0].split("/");
  return parts[parts.length - 1];
}

function int(value: number) {
  return value.toLocaleString().padStart(10, " ");
}

const PerfFolder = "c:\\temp\\perf";

export class Perf {
  private token: string;
  private iteration: number;
  private stats = {
    total: 0,
    success: 0,
    failed: 0,
  };

  public constructor() {
    this.token = "";
    this.iteration = 0;
  }

  public async test() {
    this.token = await this.getToken();

    while (true) {
      await this.runEndpoints(
        (Options.perf.endpoints as PerfEndpoint[]).filter(
          (item) => item.delay > 0
        ),
        false
      );

      prompt("Press Enter to continue");
    }
  }

  public async loop(interval: number) {
    logger.info(
      `Running perf tests every ${interval} minutes ${(
        interval * 60
      ).toLocaleString()} seconds`
    );

    while (true) {
      this.token = await this.getToken();

      await this.runAll(false);
      await this.runMultipleTimes(true);
      await this.runAll(true);
      console.log("\r\n...");
      await Utility.sleep(interval * 60);
    }
  }

  private async runMultipleTimes(delay: boolean) {
    const endpoints = (Options.perf.endpoints as PerfEndpoint[])
      .filter((item) => item.delay > 0)
      .map((endpoint) => Array(10).fill(endpoint))
      .flat();
    await this.runEndpoints(endpoints, delay);
  }

  private async runAll(delay: boolean) {
    await this.runEndpoints(Options.perf.endpoints, delay);
  }

  private async runEndpoints(endpoints: PerfEndpoint[], delay: boolean) {
    this.iteration++;

    logger.info(
      `${int(this.iteration)} Running endpoints: ${
        endpoints.length
      } ${this.iteration.toLocaleString().padStart(5)} at ` +
        new Date().toLocaleString()
    );

    const tasks = endpoints.map((endpoint: PerfEndpoint) =>
      this.timeIt(endpoint, this.token, delay)
    );

    const results = await Promise.all(tasks);

    await this.reportResults(results);
    this.writePerResults(results);
  }

  private async reportResults(results: PerfResult[]) {
    const sql = new Sql(
      Options.perf.sql.server,
      Options.perf.sql.database,
      Options.perf.sql.username,
      Options.perf.sql.password
    );

    const query = `
DECLARE @Request NVARCHAR(MAX) = '${JSON.stringify(results)}';
EXEC [Perf].[PerfDataCreate] @Request
    `;
    const queryFolder = `${PerfFolder}\\query`;
    Utility.path.ensure_directory(queryFolder);

    const queryFilePath = `${queryFolder}\\${Utility.random.generateUUID()}.sql`;
    Utility.file.writeTextFile(queryFilePath, query);

    await uploadResults();

    Utility.file.deleteFile(queryFilePath);

    async function uploadResults() {
      let error = "";

      for (let idx = 0; idx < 3; idx++) {
        error = <string>await sql.exec(queryFilePath, true);
        if (!error) {
          console.log(
            `Uploaded results: ${idx} EXEC [Perf].[PerfDataCreate] ${queryFilePath}`
          );
          return;
        }
      }

      console.log(
        `Failed to upload results: EXEC [Perf].[PerfDataCreate] ${queryFilePath}`
      );
      console.log(query);
    }
  }

  private writePerResults(results: PerfResult[]) {
    const folder = PerfFolder;
    Utility.path.ensure_directory(folder);

    const allResultsCsvFilePath = `${folder}\\perf.csv`;
    const allResultsCsv = results.map((item) => toCsvLine(item));
    Utility.file.writeTextFile(
      allResultsCsvFilePath,
      allResultsCsv.join("\r\n"),
      {
        append: true,
        create: true,
      }
    );

    function toCsvLine(item: PerfResult): string {
      const startTime = item.startTime.toISOString();
      const endTime = item.endTime.toISOString();
      const parts = [
        "###",
        item.method,
        item.duration,
        startTime,
        endTime,
        item.url.replace(/,/g, ""),
        item.error?.replace(/,/g, ""),
        ,
        item.delay,
        item.status,
        item.bodyLength,
      ];
      return parts.join(",");
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
      this.stats.total++;

      logger.trace(
        `\r${int(this.stats.success)} / ${int(this.stats.total)} / ${int(
          this.stats.failed
        )}                         `
      );

      await fetch(url, params);
      const resp = await fetch(url, params);
      this.stats.success += resp.ok ? 1 : 0;
      this.stats.failed += resp.ok ? 0 : 1;

      logger.trace(
        `\r${int(this.stats.success)} / ${int(this.stats.total)} / ${int(
          this.stats.failed
        )}                         `
      );

      if (!resp.ok) {
        logger.error(
          `Fetch failed ${resp.status} ${resp.statusText} for ${url}`
        );

        return <FetchResponse>{
          status: resp.status || 500,
          error: resp.statusText || "Unknown error",
        };
      }

      const body = await resp.text();
      return <FetchResponse>{
        status: resp.status,
        error: body?.length > 0 ? null : "Empty body",
        bodyLength: body?.length,
      };
    } catch (error) {
      logger.error(`Fetch failed ${error} for ${url}`);
      this.stats.failed++;
      return <FetchResponse>{
        status: 500,
        error: error.toString().replace(/,/g, "-") || "Unknown exception",
      };
    }
  }

  private async timeIt(endpoint: PerfEndpoint, token: string, delay: boolean) {
    const delaySeconds = await this.delay(delay, endpoint);

    const now = new Date();
    const start = Date.now();

    const results: FetchResponse = await this.fetch(
      endpoint.url,
      token,
      endpoint.method,
      endpoint.payload
    );

    const end = Date.now();
    const duration = end - start; // + MaxDuration;

    if (Options.verbose) {
      logger.info(toDurationString(duration), endpoint.method, endpoint.url);
    }

    return <PerfResult>{
      status: results.status,
      method: endpoint.method,
      endpoint: getEndpoint(endpoint.url),
      url: endpoint.url,
      duration,
      startTime: now,
      endTime: new Date(),
      error: results.error || "",
      delay: delaySeconds || "",
      bodyLength: results.bodyLength,
    };
  }

  private async delay(delay: boolean, endpoint: PerfEndpoint) {
    if (!delay || endpoint.delay <= 0) return null;

    const delaySeconds = Utility.random.getRandomInt(2, endpoint.delay);
    await Utility.sleep(delaySeconds);

    return delaySeconds;
  }

  private async getToken() {
    const service = new Token();
    const tokenData = Options.tokens[Options.perf.token];
    const token = await service.token(tokenData);
    return token;
  }
}
