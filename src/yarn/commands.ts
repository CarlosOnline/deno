// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import {
  DOMParser,
  Element,
} from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

import { brightCyan, brightGreen } from "https://deno.land/std/fmt/colors.ts";

import { command, DataToTable } from "../support/index.ts";
import Options from "../options/options.ts";
import { logger, Utility } from "../utility/index.ts";
import { Yarn } from "./yarn.ts";

export default class YarnCommands {
  @command("yarn.logs", "Yarn logs", [
    "yarn.logs appId",
    "yarn.logs appId idx --open",
  ])
  async yarnLogs() {
    if (Options.args.length < 2) {
      logger.fatal("Missing application id");
    }

    const appId: string = Options.args[1];
    const idx = Options.args.length > 2 ? parseInt(Options.args[2]) : 0;
    const env =
      Options.args.length > 3 ? Options.args[3] : Options.env || "dev";

    try {
      const yarn = new Yarn();

      const results = await yarn.getAppLog(appId, env, idx);
      if (!results || !results.logs) {
        logger.fatal("No logs found for application id: " + appId);
        return;
      }

      console.log(`App url from ${Options.env} ${env} ${results.url}`);
      console.log(`Log url from ${results.logUrl}\n`);

      if (results.logs) {
        saveLogFile(appId, results.logs);
        saveLogFile("latest", results.logs);
      }

      if (Options.open) {
        browse(results.url);
        browse(results.fullLogUrl);
      }
      console.log();
    } catch (error) {
      console.log(error);
    }
  }

  @command("yarn.open-logs", "Yarn open logs in browser", [
    "yarn.open-logs appId",
  ])
  async yarnOpenLogs() {
    if (Options.args.length < 2) {
      logger.fatal("Missing application id");
    }

    const appId: string = Options.args[1];
    const idx = Options.args.length > 2 ? parseInt(Options.args[2]) : 0;
    const env = Options.args.length > 3 ? Options.args[3] : "dev";

    const url = `${Options.yarn.cluster[env]}/cluster/app/${appId}`;
    browse(url);

    try {
      const logUrl = await getLogUrl(url, idx);

      if (!logUrl) {
        logger.fatal("No logs found");
        return;
      }

      const fullLogUrl = `${logUrl}/stderr/?start=0`;

      browse(fullLogUrl);
    } catch (error) {
      console.log(error);
    }
  }

  @command("yarn.apps", "Yarn apps", [])
  async yarnApps() {
    const env = Options.env || "dev";

    const url = `${Options.yarn.cluster[env]}/cluster/apps${getAppSuffix()}`;
    console.log(`Apps url from ${env} ${url}`);

    try {
      const yarn = new Yarn();
      const apps = (await yarn.getApps(url))
        .filter((item) => filterByArgs(item.name))
        .slice(0, Options.limit || 10)
        .map((app) => {
          return {
            "App Id": app.appId,
            Status: app.status,
            Result: app.finalStatus,
            Duration: app.durationString || "        ",
            "Start Time": app.startTime.toLocaleString(),
            Name: app.name,
          };
        });

      if (!apps || !apps.length) {
        logger.fatal("No apps found");
        return;
      }

      console.log(
        DataToTable.toTable(apps, {
          "App Id": brightGreen,
          Name: brightCyan,
        })
      );

      const json = JSON.stringify(apps, null, 3);
      saveLogFile("yarn.apps", json, {}, ".json");

      const csv = DataToTable.toCsvRaw(apps);
      saveLogFile("yarn.apps", csv + "\r\n", { append: true }, ".csv");

      const file = DataToTable.toTable(apps);
      saveLogFile("yarn.apps", file + "\r\n\r\n", { append: true });
    } catch (error) {
      console.log(error);
    }
  }
}

function saveLogFile(
  fileName: string,
  logs: string,
  options: Deno.WriteFileOptions = {},
  extension = ".log"
) {
  const folder = `${Options.tempFolder}/logs`;
  Utility.path.ensure_directory(folder);
  const filePath = `${folder}/${fileName}${extension}`.replaceAll("/", "\\");
  Utility.file.writeFile(filePath, logs, options);
  console.log(`Logs written to ${brightGreen(filePath)}`);
}

function browse(url: string) {
  Utility.run.runAsync(Options.browser, [url], Deno.cwd(), {
    skipEscape: true,
    skipWait: true,
  });
}

function getAppSuffix() {
  if (Options.running) {
    return "/RUNNING";
  }
  if (Options.finished) {
    return "/FINISHED";
  }
  if (Options.failed) {
    return "/FAILED";
  }

  if (Options.submitted) {
    return "/SUBMITTED";
  }

  return "";
}

function filterByArgs(value: string) {
  value = value.toLowerCase();
  if (!Options.args || !Options.args.length) {
    return true;
  }

  const results = Options.args.slice(1).filter((arg: string) => {
    return value.indexOf(arg.toLowerCase()) == -1;
  });

  return results.length == 0;
}
