import { logger } from "./utility.log.ts";

export class File {
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

  static isFile(filePath: string) {
    return this.fileExists(filePath);
  }

  static isFolder(filePath: string) {
    return this.directoryExists(filePath);
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

    for (const dirEntry of File.safeReadDirSync(folder)) {
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

  static readFileSafe(filePath: string): string {
    try {
      return this.readFile(filePath);
    } catch {
      return "";
    }
  }

  static writeFile(
    filePath: string,
    contents: string,
    options?: Deno.WriteFileOptions
  ): void {
    Deno.writeTextFileSync(filePath, contents, options);
  }

  static readTextFile(filePath: string): string {
    return Deno.readTextFileSync(filePath);
  }

  static writeTextFile(
    filePath: string,
    data: string,
    options?: Deno.WriteFileOptions
  ) {
    Deno.writeTextFile(filePath, data, options);
  }

  static deleteFile(filePath: string) {
    try {
      Deno.removeSync(filePath);
    } catch (err) {
      logger.error(`Error deleting file: ${filePath} - ${err}`);
    }
  }

  static async folderSize(folder: string, recursive = true) {
    let size = 0;
    let folderSizes: Promise<number>[] = [];

    const files = File.listFiles(folder);
    const fileSizes = files.map(
      async (filePath) => (await File.safeStatSync(filePath)).size
    );

    if (recursive) {
      const folders = File.listDirectories(folder, true);

      folderSizes = folders.map(
        async (folder) => await File.folderSize(folder)
      );
    }

    const sizes = await Promise.all([...folderSizes, ...fileSizes]);
    if (sizes.length) {
      size += sizes.reduce((total, current) => total + current);
    }
    return size;
  }

  static formatFileSize(bytes: number, decimalPoint = 2) {
    if (bytes == 0) return "0 Bytes";
    const k = 1000;
    const dm = decimalPoint;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const idx = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      parseFloat((bytes / Math.pow(k, idx)).toFixed(dm)) + " " + sizes[idx]
    );
  }

  static fileSizeToSize(fileSize: string | number) {
    if (typeof fileSize == "number") return fileSize;
    fileSize = fileSize.trim().replaceAll(",", "").replaceAll(" ", "");

    const value = getValue(fileSize);
    const units = getUnits(fileSize);

    return value * units;

    function getValue(value: string) {
      value = value.trim().replaceAll(",", "").replaceAll(" ", "");

      const rex = new RegExp(`(?<value>[0-9,]+)(?<units>[a-zA-Z]+)?`);
      const match = value.match(rex);
      if (match?.groups) {
        return parseInt(match.groups.value);
      }
      return 0;
    }

    function getUnits(value: string) {
      value = value.trim().replaceAll(",", "").replaceAll(" ", "");

      const rex = new RegExp(`(?<value>[0-9,]+)(?<units>[a-zA-Z]+)?`);

      const match = value.match(rex);
      if (match?.groups) {
        const units = match.groups.units;
        switch (units.toLowerCase()) {
          case "bytes":
          case "b":
            return 1;
          case "kb":
            return 1024;
          case "mb":
            return 1024 * 1024;
          case "gb":
            return 1024 * 1024 * 1024;
          case "tb":
            return 1024 * 1024 * 1024 * 1024;
          case "pb":
            return 1024 * 1024 * 1024 * 1024 * 1024;
          case "eb":
            return 1024 * 1024 * 1024 * 1024 * 1024 * 1024;
          case "zb":
            return 1024 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024;
          case "yb":
            return 1024 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024;
        }
      }

      return 1;
    }
  }

  private static safeReadDirSync(folder: string) {
    try {
      return Deno.readDirSync(folder);
    } catch {
      return <Deno.DirEntry[]>[];
    }
  }

  private static async safeStat(filePath: string) {
    try {
      return await Deno.stat(filePath);
    } catch {
      return <Deno.FileInfo>{};
    }
  }

  private static safeStatSync(filePath: string) {
    try {
      return Deno.statSync(filePath);
    } catch {
      return <Deno.FileInfo>{};
    }
  }
}
