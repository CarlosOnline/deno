import {
  ensureDirSync,
  existsSync,
} from "https://deno.land/std/fs/mod.ts";

import {
  accessSync,
} from "https://deno.land/std/node/fs.ts";

import { resolve } from "https://deno.land/std/path/mod.ts";

const { lstatSync, readDirSync } = Deno;

export default class File {
  static get_date_time(filePath: string) {
    try {
      let stats = lstatSync(filePath);
      return stats.mtime;
    } catch (error) {
      console.error(`get_date_time`, filePath, error);
      throw error;
    }
  }

  static resolve(file_path: string) {
    try {
      return resolve(file_path);
    } catch (error) {
      console.error(`resolve`, file_path, error);
      throw error;
    }
  }

  static full_path(file_path: string) {
    try {
      return resolve(file_path);
    } catch (error) {
      console.error(`full_path`, file_path, error);
      throw error;
    }
  }

  static exists(path: string) {
    try {
      let idx = path.indexOf("*");
      if (idx != -1) {
        console.log("glob", path);
        let files = readDirSync(path, {});
        console.log("glob", path, files);
        return files.length > 0;
      }

      accessSync(path, fs.F_OK);
      return lstatSync(path).isFile();
    } catch (error) {
      return false;
    }
  }

  static folder_exists(path) {
    try {
      fs.accessSync(path, fs.F_OK);
      return fs.lstatSync(path).isDirectory();
    } catch (error) {
      return false;
    }
  }

  static glob_exists(path) {
    try {
      console.log("glob", path);
      let files = glob.sync(path, {});
      console.log("glob", path, files);
      return files.length > 0;
    } catch (error) {
      return false;
    }
  }

  static delete(path, verbose) {
    try {
      verbose = verbose || false;
      if (verbose) console.log("delete", path);
      fs.unlinkSync(path, function (err) {
        console.error("delete " + path + " " + err);
      });
    } catch (error) {
      console.error("delete " + path + " " + error);
      return false;
    }
  }

  static deleteFiles(path, verbose) {
    verbose = verbose || false;
    if (verbose) console.log("deleteFiles", path);
    let files = glob.sync(path, {});
    files.forEach((file) => {
      Utility.file.delete(file);
    });
  }

  static delete_files(folder, pattern, verbose) {
    pattern = pattern || "*";
    verbose = verbose || false;
    if (verbose) console.log("delete_files", folder, pattern);

    let files = glob.sync(pattern, { cwd: folder });
    files.forEach((file) => {
      Utility.file.delete(folder + "\\" + file);
    });
    return files;
  }

  static copy(src_path, tgt_path, verbose) {
    verbose = verbose || false;
    if (verbose) console.log("copy", src_path, tgt_path);

    fs_extra.copySync(src_path, tgt_path);
  }

  static list_files(dir, filter, fileList = []) {
    filter = filter || null;
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const fileStat = fs.lstatSync(filePath);

      if (fileStat.isDirectory()) {
        Utility.file.list_files(filePath, filter, fileList);
      } else if (!filter || filter.test(filePath)) {
        fileList.push(filePath);
      }
    });

    return fileList;
  }

  /**
     * List top level directories in folder.
     * @param {folder} folder
     */
  static list_directories(folder) {
    return fs.readdirSync(folder, {
      withFileTypes: false,
    });
  }

  static append(file_path, text) {
    fs.appendFile(file_path, text, function (err) {
      if (err) console.error(`append file error ${err} to ${file_path}`);
    });
  }

  static append_line(file_path, text) {
    fs.appendFile(file_path, text + "\r\n", function (err) {
      if (err) console.error(`append file error ${err} to ${file_path}`);
    });
  }

  static parent_folder_path(file_path) {
    return path.dirname(file_path);
  }

  static parent_folder_name(file_path) {
    return path.dirname(file_path).split(path.sep).pop();
  }

  static read_file(file_path, encoding) {
    encoding = encoding || "utf8";
    if (!File.exists(file_path)) return null;

    return fs.readFileSync(file_path, encoding);
  }

  static read_json_file(file_path) {
    let contents = File.read_file(file_path);
    if (contents) {
      try {
        return JSON.parse(contents);
      } catch (err) {
        console.error("ERROR: read_json_file", file_path, err.message);
        return null;
      }
    }
    return null;
  }

  static write_json_file(file_path, data) {
    if (!file_path || !data) {
      console.error("Missing args", file_path, data);
      return;
    }

    let folder = path.dirname(file_path);
    Path.ensure_directory(folder);

    try {
      fs.writeFileSync(file_path, JSON.stringify(data, " ", 3), {});
    } catch (error) {
      console.error("write_json_file - fs.writeFileSync " + error, file_path);
    }
  }

  static read_json_file(file_path) {
    let contents = File.read_file(file_path);
    if (contents) {
      try {
        return JSON.parse(contents);
      } catch (err) {
        console.error("ERROR: read_json_file", file_path, err.message);
        return null;
      }
    }
    return null;
  }

  static write_json_file(file_path, data) {
    if (!file_path || !data) {
      console.error("Missing args", file_path, data);
      return;
    }

    let folder = path.dirname(file_path);
    Path.ensure_directory(folder);

    try {
      fs.writeFileSync(file_path, JSON.stringify(data, " ", 3), {});
    } catch (error) {
      console.error("write_json_file - fs.writeFileSync " + error, file_path);
    }
  }

  static read_yaml_file(file_path) {
    let contents = File.read_file(file_path);
    if (contents) {
      try {
        return yaml.safeLoad(contents);
      } catch (err) {
        console.error("ERROR: read_yaml_file", file_path, err.message);
        return null;
      }
    }
    return null;
  }

  static write_yaml_file(file_path, data) {
    if (!file_path || !data) {
      console.error("Missing args", file_path, data);
      return;
    }

    let folder = path.dirname(file_path);
    Path.ensure_directory(folder);

    try {
      fs.writeFileSync(file_path, yaml.safeDump(data), {});
    } catch (error) {
      console.error("write_yaml_file - fs.writeFileSync " + error, file_path);
    }
  }

  static read_ini_file(file_path) {
    let contents = File.read_file(file_path);
    if (contents) {
      try {
        return ini.parse(contents);
      } catch (err) {
        console.error("ERROR: read_ini_file", file_path, err.message);
        return null;
      }
    }
    return null;
  }

  static write_ini_file(file_path, data) {
    if (!file_path || !data) {
      console.error("Missing args", file_path, data);
      return;
    }

    let folder = path.dirname(file_path);
    Path.ensure_directory(folder);

    try {
      fs.writeFileSync(file_path, ini.stringify(data), {});
    } catch (error) {
      console.error("write_ini_file - fs.writeFileSync " + error, file_path);
    }
  }
}
