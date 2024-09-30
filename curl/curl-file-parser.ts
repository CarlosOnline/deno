// deno-lint-ignore-file no-explicit-any
import { Utility, Url, UrlInfo } from "../utility/index.ts";

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
          line.replace(/-H 'Authorization: Bearer.*/g, authHeaderValue)
        );
      return lines.join(" ");
    });
  }

  private replaceWithValues(command: string) {
    return command.replace(/\[UniqueId\]/g, Utility.random.generateUUID());
  }

  private getCurlInfoChrome(command: string): UrlInfo | null {
    const pattern =
      /curl\s+'(?<url>[^']*)'\s*(-X\s+'(?<method>[^']+)'\s+)?(?<headers>((-H\s+'[^']+')\s*)*).*((-d|--data-raw)\s+\$?'(?<payload>.+)')?/;
    const match = command.match(pattern);
    if (match?.groups) {
      const groups = match.groups;

      return Url.parseUrl(
        groups.method || "GET",
        groups.url,
        groups.headers,
        groups.payload
      );
    }

    return null;
  }

  private getCurlInfoSwagger(command: string): UrlInfo | null {
    const pattern =
      /curl\s+(-X\s+'(?<method>[^']+)'\s+)?'(?<url>[^']*)'\s*(?<headers>((-H\s+'[^']+')\s*)*\s*)*((-d|--data-raw)\s+\$?'(?<payload>.+)')?/;
    const match = command.match(pattern);
    if (match?.groups) {
      const groups = match.groups;

      return Url.parseUrl(
        groups.method,
        groups.url,
        groups.headers,
        groups.payload,
        command.indexOf("--data-raw") !== -1
      );
    }

    return null;
  }

  private getCurlInfo(command: string): UrlInfo | null {
    const urlInfo =
      this.getCurlInfoSwagger(command) || this.getCurlInfoChrome(command);
    if (!urlInfo) return null;

    if (!urlInfo.method) {
      urlInfo.method = urlInfo.payload ? "POST" : "GET";
    }

    return urlInfo;
  }
}
