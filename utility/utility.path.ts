import { ensureDirSync, existsSync } from "https://deno.land/std/fs/mod.ts";
import { dirname } from "https://deno.land/std/path/mod.ts";
import { basename } from "https://deno.land/std@0.184.0/path/mod.ts";

const { mkdirSync, removeSync } = Deno;

import { Utility } from "./utility.ts";

export class Path {
  static basename(filePath: string) {
    return basename(filePath);
  }

  static dirname(filePath: string) {
    return dirname(filePath);
  }

  static exists(filePath: string) {
    return existsSync(filePath);
  }

  static ensure_directory(folder: string) {
    try {
      ensureDirSync(folder);
      return;
    } catch (err) {
      Utility.log.error(`ensure_directory: ${folder}`, err);
    }
  }

  static create_directory(folder: string) {
    return mkdirSync(folder, { recursive: true });
  }

  static remove_directory(path: string) {
    removeSync(path, { recursive: true });
  }

  static get_drive(filePath: string) {
    let folder = dirname(filePath);
    while (folder != dirname(folder)) {
      folder = dirname(folder);
    }
    return folder.replace("\\", "");
  }

  static get_first_folder(filePath: string) {
    let folder = dirname(filePath);
    while (folder != dirname(folder)) {
      folder = dirname(folder);
    }
    const drive = folder;

    folder = dirname(filePath);
    while (dirname(folder) != drive) {
      folder = dirname(folder);
    }
    return folder;
  }
}
