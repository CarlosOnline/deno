import { logger } from "./utility.log.ts";

export default class File {
  static exists(filePath: string) {
    try {
      Deno.statSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static fileExists(filePath: string) {
    try {
      const results = Deno.statSync(filePath);
      return results.isFile;
    } catch {
      return false;
    }
  }

  static directoryExists(filePath: string) {
    try {
      const results = Deno.statSync(filePath);
      return results.isDirectory;
    } catch {
      return false;
    }
  }

  static listDirectories(folder: string, recursive = false) {
    const results: string[] = [];

    for (const dirEntry of Deno.readDirSync(folder)) {
      const entryPath = `${folder}/${dirEntry.name}`;

      if (dirEntry.isDirectory) {
        results.push(entryPath);

        if (recursive) {
          results.splice(
            results.length,
            0,
            ...File.listDirectories(entryPath, true)
          );
        }
      }
    }

    return results;
  }

  static listDirectoryContents(folder: string, all = false, recursive = false) {
    const results: string[] = [];

    for (const dirEntry of Deno.readDirSync(folder)) {
      const entryPath = `${folder}/${dirEntry.name}`;

      if (all || !dirEntry.isDirectory) {
        results.push(entryPath);

        if (recursive) {
          results.splice(results.length, 0, ...File.listFiles(entryPath, true));
        }
      }
    }

    return results;
  }

  static listFiles(folder: string, recursive = false) {
    const results: string[] = [];

    for (const dirEntry of Deno.readDirSync(folder)) {
      const entryPath = `${folder}/${dirEntry.name}`;

      if (dirEntry.isFile) {
        results.push(entryPath);

        if (recursive) {
          results.splice(results.length, 0, ...File.listFiles(entryPath, true));
        }
      }
    }

    return results;
  }

  static readFile(filePath: string): string {
    const decoder = new TextDecoder("utf-8");
    const data = Deno.readFileSync(filePath);
    return decoder.decode(data);
  }
}
