// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import {
  DOMParser,
  Element,
} from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

import { brightCyan, brightGreen } from "https://deno.land/std/fmt/colors.ts";

import { command } from "../support/index.ts";
import Options from "../support/options.ts";
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

    const url = `${Options.yarn.cluster[env]}/cluster/app/${appId}`;
    console.log(`App url from ${Options.env} ${env} ${url}`);

    try {
      const logUrl = await getLogUrl(url, idx);
      console.log(`Log url from ${logUrl}`);

      if (!logUrl) {
        logger.fatal("No logs found");
        return;
      }

      const fullLogUrl = `${logUrl}/stderr/?start=0`;
      const logs = await fetchLogContents(fullLogUrl);
      if (logs) {
        saveLogFile(appId, logs);
        saveLogFile("latest", logs);
      }

      if (Options.open) {
        browse(url);
        browse(fullLogUrl);
      }
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
    console.log(`Apps url from ${Options.env} ${env} ${url}`);

    try {
      const yarn = new Yarn();
      let apps = await yarn.getApps(url);
      apps = apps
        .filter((item) => filterByArgs(item.name))
        .slice(0, Options.limit || 5);

      if (!apps || !apps.length) {
        logger.fatal("No apps found");
        return;
      }

      const results: string[] = [];
      apps.forEach((app) => {
        results.push(
          `${brightGreen(app.appId)} ${app.status.padEnd(
            10
          )} - ${app.finalStatus.padEnd(10)} - ${app.durationString.padEnd(
            8
          )} - ${app.startTime.toLocaleString().padEnd(25)} - ${brightCyan(
            app.name
          )}`
        );
      });

      console.log(
        `${"App Id".padEnd(30)} ${"Status".padEnd(10)} - ${"Result".padEnd(
          10
        )} - Duration - ${"Start Time".padEnd(25)} - Name`
      );
      console.log(results.join("\n"));

      saveLogFile("apps", results.join("\n"), { append: true });
    } catch (error) {
      console.log(error);
    }
  }
}

function getHref(script: Element, idx: number) {
  const contents = script.textContent
    .replace(" var attemptsTableData=", "")
    .trim();

  const hrefs = contents
    .split(",")
    .filter((item) => item.includes("/node/containerlogs/"))
    .map((item) => {
      return getHrefs(item);
    })
    .flat();

  console.log(hrefs);
  if (!hrefs.length) {
    logger.fatal("No logs found");
    return null;
  }

  return hrefs[Math.min(hrefs.length - 1, idx)];
}

function getHrefs(anchorHtml: string) {
  const document = new DOMParser().parseFromString(
    `<html>${anchorHtml}</html>`,
    "text/html"
  );

  return document
    .getElementsByTagName("a")
    .map((a: any) => {
      console.log(a.getAttribute("href"));
      return a.getAttribute("href") as string;
    })
    .filter((item) => item.includes("/node/containerlogs/"));
}

async function fetchLogContents(url: string) {
  try {
    const res = await fetch(url);
    const html = await res.text();

    const document = new DOMParser().parseFromString(html, "text/html");

    const contents =
      document.querySelector(".content")?.textContent.replaceAll("\r", "") ||
      "";
    return contents.trim();
  } catch (error) {
    console.log(error);
  }
  return "";
}

async function getLogUrl(url: string, idx: number) {
  const res = await fetch(url);
  const html = await res.text();

  const document = new DOMParser().parseFromString(html, "text/html");

  const scripts = document
    .getElementsByTagName("script")
    .filter((script) => {
      return script.textContent.includes("/node/containerlogs/");
    })
    .flat();

  if (!scripts || !scripts.length) {
    logger.fatal("No script tags with logs found");
    return;
  }

  return getHref(scripts[0], idx);
}

function saveLogFile(
  fileName: string,
  logs: string,
  options: Deno.WriteFileOptions = {}
) {
  const folder = `${Options.tempFolder}/logs`;
  Utility.path.ensure_directory(folder);
  const filePath = `${folder}/${fileName}.log`.replaceAll("/", "\\");
  Utility.file.writeFile(filePath, logs, options);
  console.log(`Logs written to ${filePath}`);
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
