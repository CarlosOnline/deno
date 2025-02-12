// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import CurlParser from "../support/curl-parser/parser.ts";
import type { ParsedCURL } from "../support/index.ts";
import Options from "../support/options.ts";
import { Utility, UrlInfo } from "../utility/index.ts";

export class CurlFileParser {
  parseCurlFile(filePath: string) {
    const contents = this.getFileContents(filePath);
    return this.getCurlCommands(contents)
      .map((command) => this.replaceWithValues(command))
      .map((command) => this.getCurlInfo(command))
      .filter((item) => item !== null) as UrlInfo[];
  }

  private getFileContents(filePath: string) {
    const authHeaderValue = `-H 'Authorization: Bearer *******'`;

    return Utility.file
      .readTextFile(filePath)
      .split("\n")
      .map((line) => line.trim())
      .map((line) => line.replace(/\\$/g, "").trim())
      .filter((line) => line.length > 0)
      .filter((line) => !line.startsWith("#"))
      .map((line) =>
        Options.skipAuth
          ? line
          : line.replace(/-H 'Authorization: Bearer.*/g, authHeaderValue)
      )
      .join("\n");
  }

  private getCurlCommands(contents: string) {
    const ranges: string[] = [];

    contents = "\n" + contents;
    let previousIdx = -1;

    while (true) {
      const start = previousIdx != -1 ? previousIdx + 6 : 0;
      const idx = contents.indexOf("\ncurl ", start);

      if (previousIdx != -1) {
        const end = idx != -1 ? idx : undefined;
        const range = contents.substring(previousIdx, end).trim();
        ranges.push(range);
      }

      if (idx == -1) {
        break;
      }

      previousIdx = idx;
    }

    return ranges;
  }

  private replaceWithValues(command: string) {
    while (command.indexOf("[UniqueId]") != -1) {
      command = command.replace(/\[UniqueId\]/, Utility.random.generateUUID());
    }

    while (command.indexOf("[UniqueNumber]") != -1) {
      command = command.replace(
        /\[UniqueNumber\]/,
        Utility.random.getRandomInt(1000, 9999).toString()
      );
    }

    return command;
  }

  private getPayload(parsed: ParsedCURL, command: string) {
    const contentType = parsed.headers["content-type"];
    if (!parsed.body.raw) {
      if (parsed.body.data) {
        return contentType == "application/json"
          ? JSON.stringify(parsed.body.data)
          : parsed.body.data;
      }

      return "";
    }

    // Search for -D 'data' in the command
    const match = command
      .replace("--data-raw", "-D")
      .match(new RegExp(/.*\s(-D\s+'(?<payload>[^']+)')(\s.*|$)/));

    if (match?.groups) {
      return match.groups.payload;
    }

    return "";
  }

  private getCurlInfoRaw(command: string): UrlInfo | null {
    const parser = new CurlParser(command.replaceAll("\n", " "));
    const parsed = parser.parse();

    if (parsed.headers.authorization) {
      parsed.headers.Authorization = parsed.headers.authorization;
      delete parsed.headers.authorization;
    }
    if (Options.verbose) {
      console.log(parsed);
    }

    if (!parsed) {
      throw new Error("Invalid curl command");
    }

    const payload = this.getPayload(parsed, command);

    return new UrlInfo(
      parsed.method || "GET",
      parsed.url,
      parsed.headers,
      payload,
      parsed.body.raw,
      command
    );
  }

  private getCurlInfo(command: string): UrlInfo | null {
    const urlInfo = this.getCurlInfoRaw(command);
    if (!urlInfo) return null;

    if (!urlInfo.method) {
      urlInfo.method = urlInfo.payload ? "POST" : "GET";
    }

    return urlInfo;
  }
}
