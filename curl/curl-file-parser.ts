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

  private getCurlInfo(command: string): UrlInfo | null {
    const xid = this.getCurlId(command);

    const pattern =
      /curl\s+-X\s+'(?<method>[^']+)'\s+'(?<url>[^']*)'\s*(?<headers>((-H\s+'[^']+')\s*)*\s*)*((-d|--data-raw)\s+'(?<payload>.+)')?/;
    const match = command.match(pattern);
    if (match?.groups) {
      const groups = match.groups;

      return Url.parseUrl(
        groups.method,
        groups.url,
        groups.headers,
        groups.payload,
        command,
        xid
      );
    }

    return null;
  }

  private getCurlId(command: string): string {
    const pattern = /.*xid: (?<xid>\d*).*/;
    const match = command.match(pattern);
    if (match?.groups) {
      const groups = match.groups;
      return groups.xid;
    }

    return "";
  }
}
