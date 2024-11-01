// deno-lint-ignore-file no-explicit-any
import CurlParser from "../support/curl-parser/parser.ts";
import Options from "../support/options.ts";
import { Utility, Url, UrlInfo } from "../utility/index.ts";

interface CurlArg {
  key: string;
  value: string;

  line: string;
  originalKey: string;
  originalValue: string;
}

export class CurlFileParser {
  parseCurlFile(filePath: string) {
    return this.getCurlCommandLinesFromFile(filePath)
      .map((command) => this.replaceWithValues(command))
      .map((command) => this.getCurlInfo(command))
      .filter((item) => item !== null) as UrlInfo[];
  }

  private getFileContents(filePath: string) {
    return Utility.file
      .readTextFile(filePath)
      .split("\n")
      .map((line) => line.trim())
      .map((line) => line.replace(/\\$/g, "").trim())
      .filter((line) => line.length > 0)
      .filter((line) => !line.startsWith("#"))
      .join("\n");
  }

  private getCurlRanges(contents: string) {
    const sections: string[] = [];

    let previousIdx = 0;
    let idx = contents.indexOf("curl");
    if (idx == 0) {
      idx = contents.indexOf("curl", idx + 1);
    }

    while (idx > 0) {
      const command = contents.substring(previousIdx, idx);
      sections.push(command);

      previousIdx = idx;

      idx = contents.indexOf("curl", idx + 1);
    }

    const command = contents.substring(previousIdx, contents.length);
    sections.push(command);

    return sections;
  }

  private getCurlCommandLinesFromFile(filePath: string) {
    const authHeaderValue = `-H 'Authorization: Bearer *******'`;

    return this.getCurlRanges(this.getFileContents(filePath)).map((section) => {
      const lines = section
        .split("\n")
        .map((line) => line.trim())
        .map((line) =>
          Options.skipAuth
            ? line
            : line.replace(/-H 'Authorization: Bearer.*/g, authHeaderValue)
        );
      return lines.join(" ");
    });
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

  private getCurlInfoRaw(command: string): UrlInfo | null {
    const parser = new CurlParser(command);
    const parsed = parser.parse();

    if (parsed.headers.authorization) {
      parsed.headers.Authorization = parsed.headers.authorization;
      delete parsed.headers.authorization;
    }
    //console.log("parsed", parsed);

    if (parsed) {
      const headers = Object.keys(parsed.headers).map((key) => {
        return `-H '${key}: ${parsed.headers[key]}'`;
      });

      const payload = parsed.body.data
        ? parsed.body.raw
          ? parsed.body.data
          : JSON.stringify(parsed.body.data)
        : "";

      return Url.parseUrl(
        parsed.method || "GET",
        parsed.url,
        headers.join(" "),
        payload,
        parsed.body.raw,
        command
      );
    }

    const patterns = [
      /curl\s+'(?<url>[^']*)'\s*(-X\s+'(?<method>[^']+)'\s+)?(?<headers>((-H\s+'[^']+')\s*)*)((-d|--data-raw)\s+\$?'(?<payload>.+)')?/,
      /curl\s+(-X\s+'(?<method>[^']+)'\s+)?'(?<url>[^']*)'\s*(?<headers>((-H\s+'[^']+')\s*)*\s*)*((-d|--data-raw)\s+\$?'(?<payload>.+)')?/,
    ];
    patterns.forEach((pattern) => {
      const match = command.match(pattern);
      if (match?.groups) {
        const groups = match.groups;

        return Url.parseUrl(
          groups.method || "GET",
          groups.url,
          groups.headers,
          groups.payload,
          false,
          command
        );
      }
    });

    return null;
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
