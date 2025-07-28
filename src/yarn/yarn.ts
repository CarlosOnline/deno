// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import {
  DOMParser,
  Element,
} from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

import * as _ from "lodash";
const orderBy = _.default.orderBy;

import Options from "../options/options.ts";
import {
  DefaultRunOptions,
  RunOptions,
  logger,
  Utility,
} from "../utility/index.ts";

import { AppModel } from "./app.model.ts";

export class Yarn {
  public async getApps(url: string): Promise<AppModel[]> {
    const html = await this.getYarnAppsHtml(url);

    const document = new DOMParser().parseFromString(html, "text/html");

    const scripts = document
      .getElementsByTagName("script")
      .filter((script) => {
        return script.textContent.includes("var appsTableData");
      })
      .flat();

    if (!scripts || !scripts.length) {
      logger.fatal("No script tags with var appsTableData");
      return [];
    }

    const apps = scripts
      .map((script) => {
        const json = script.textContent
          .trim()
          .replace("var appsTableData=", "")
          .replaceAll("\\", "");

        const appsData = JSON.parse(json);
        if (!appsData || !appsData.length) {
          logger.fatal("No apps found in appsTableData");
          return [];
        }

        return appsData.map((array: any) => {
          const href = getHrefData(array[0]);

          const startTime = parseInt(array[7], 10);
          const launchTime = parseInt(array[8], 10);
          const finishTime = parseInt(array[9], 10);
          const duration = finishTime ? (finishTime - launchTime) / 1000 : 0;

          const app: AppModel = {
            appId: href.text,
            url: href.href,
            user: array[1],
            name: array[2],
            queue: array[5],
            status: array[10],
            finalStatus: array[11] || "",
            startTime: new Date(startTime),
            launchTime: launchTime ? new Date(launchTime) : null,
            finishTime: finishTime ? new Date(finishTime) : null,
            duration: duration,
            durationString: toDurationString(duration),
          };

          return app;
        });
      })
      .flat();

    const results = orderBy(apps, ["startTime"], ["desc"]) as AppModel[];

    return results;
  }

  public async getAppLog(appId: string, env: string, idx = 0) {
    const url = `${Options.yarn.cluster[env]}/cluster/app/${appId}`;

    const logUrl = await this.getLogUrl(url, idx);
    if (!logUrl) {
      return null;
    }

    const fullLogUrl = `${logUrl}/stderr/?start=0`;
    const logs = await this.fetchLogContents(fullLogUrl);

    return {
      url: url,
      logUrl: logUrl,
      fullLogUrl: fullLogUrl,
      logs: logs,
    };
  }

  private async getYarnAppsHtml(url: string) {
    if (Options.test) {
      if (Utility.file.exists("c:\\temp\\yarn-apps.html")) {
        const html = Utility.file.readTextFile("c:\\temp\\yarn-apps.html");
        if (html) {
          return html;
        }
      }
    }

    const res = await fetch(url);
    const html = await res.text();
    Utility.file.writeTextFile("c:\\temp\\yarn-apps.html", html);

    return html;
  }

  private async getLogUrl(url: string, idx: number) {
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

    return this.getHref(scripts[0], idx);
  }

  private getHref(script: Element, idx: number) {
    const contents = script.textContent
      .replace(" var attemptsTableData=", "")
      .trim();

    const hrefs = contents
      .split(",")
      .filter((item) => item.includes("/node/containerlogs/"))
      .map((item) => {
        return this.getHrefs(item);
      })
      .flat();

    console.log(hrefs);
    if (!hrefs.length) {
      logger.fatal("No logs found");
      return null;
    }

    return hrefs[Math.min(hrefs.length - 1, idx)];
  }

  private getHrefs(anchorHtml: string) {
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

  private async fetchLogContents(url: string) {
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
}

function getHrefData(anchorHtml: string) {
  const document = new DOMParser().parseFromString(
    `<html>${anchorHtml}</html>`,
    "text/html"
  );

  return document.getElementsByTagName("a").map((a: Element) => {
    return {
      href: a.getAttribute("href") as string,
      text: a.textContent || "",
    };
  })[0];
}

function toDurationString(duration: number): string {
  if (!duration || duration <= 0) return "";

  const date = new Date(0);
  date.setSeconds(duration);
  return date.toISOString().substring(11, 19);
}
