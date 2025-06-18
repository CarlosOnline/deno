// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import { dirname } from "https://deno.land/std/path/mod.ts";
import {
  VisualStudioOptions,
  VisualStudioOptionsBuilder,
} from "./options.vs.ts";
import {
  EnvironmentData,
  EnvironmentSql,
  EnvironmentApp,
} from "./environment.ts";

export interface TokenDataBody {
  grant_type: string;
  client_id: string;
  client_secret: string;
  scope: string;
}

export interface TokenData {
  url: string;
  body: TokenDataBody;
}

export class DefaultOptions extends VisualStudioOptions {
  [index: string]: any;
  // Environment file to load.
  options: string | string[] = "";
  scriptFolder = "";
  tempFolder = "c:/temp";
  args: string[] = [];
  authToken: string = ""; // "none";
  brave = `${Deno.env.get(
    "USERPROFILE"
  )}\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`;
  browser = `${Deno.env.get(
    "USERPROFILE"
  )}\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`;
  chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  cwdBackup = Deno.cwd();
  git = {
    cmd: "C:/Program Files/Git/cmd/git.exe",
    mainBranches: ["main", "master", "develop"],
    develop: "develop",
  };
  //develop = "develop";  -- override develop branch
  helm = "C:/dev/bin/helm.exe";
  mvn = {
    cmd: "c:\\Program Files\\JetBrains\\IntelliJ IDEA Community Edition 2023.2.2\\plugins\\maven\\lib\\maven3\\bin\\mvn.cmd",
    skipTests: true,
  };
  oc = "c:/dev/bin/oc.exe";
  sqlcmd =
    '"C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\170\\Tools\\Binn\\SQLCMD.EXE"';

  // environment json loaded options
  apps?: EnvironmentApp = {};
  sql: EnvironmentSql = {
    server: "Default Server",
    database: "Default Database",
  };

  serviceTokenFile: string = "";
  projects: { [key: string]: string } = {};

  getArg(index: number, defaultValue: any = undefined) {
    if (this.args.length > index) {
      return this.args[index];
    }
    return defaultValue;
  }
}

export type OptionsType =
  | DefaultOptions
  | VisualStudioOptions
  | EnvironmentData
  | Record<string, any>;

export function loadEnvironmentFile<T>(fileName: string) {
  const filePath = `${Options.scriptFolder}/../env/${fileName}`;
  const data = Deno.readFileSync(filePath);
  const decoder = new TextDecoder("utf-8");
  const contents = decoder.decode(data);
  return JSON.parse(contents) as T;
}

class OptionsParser {
  public initializeOptions() {
    this.initializeScriptFolder();
    this.initializeVisualStudio();
    this.parseArgs(Deno.args);
    this.loadEnvironmentData(Options.options);
  }

  private initializeScriptFolder() {
    const filePath = Deno.mainModule.replace("file:///", "");
    Options.scriptFolder = dirname(filePath);
  }

  private initializeVisualStudio() {
    const vs = new VisualStudioOptionsBuilder();
    const options = vs.getOptions();
    Object.assign(Options, options);
  }

  private loadEnvironmentData(fileNames: string | string[]) {
    const loadEnvironment = (fileName: string) => {
      const settings: EnvironmentData = loadEnvironmentFile(fileName);
      Object.assign(Options, settings);
    };

    if (!fileNames) {
      return;
    }

    if (Array.isArray(fileNames)) {
      fileNames.forEach((e) => loadEnvironment(e));
    } else {
      loadEnvironment(fileNames);
    }
  }

  private parseArgs(args: string[]) {
    for (let idx = 0; idx < args.length; idx++) {
      const arg = args[idx];
      const nextArg = idx + 1 < args.length ? args[idx + 1] : "";

      // Process switches
      if (arg.startsWith("--")) {
        const key = arg.substring(2);
        if (!key) {
          console.error(`Invalid arg ${arg} from ${args}`);
          continue;
        }

        if (!nextArg || nextArg.startsWith("--")) {
          Options[key] = true;
        } else {
          if (nextArg === "true") {
            Options[key] = false;
          } else if (nextArg === "false") {
            Options[key] = false;
          } else if (OptionsParser.isNumeric(nextArg)) {
            Options[key] = parseInt(nextArg);
          } else {
            if (Options[key]) {
              if (Array.isArray(Options[key])) {
                Options[key].push(nextArg);
              } else {
                Options[key] = [Options[key], nextArg];
              }
            } else {
              Options[key] = nextArg;
            }
          }
          idx++;
        }
      }
      // Process free values
      else {
        Options.args.push(arg);
      }
    }
  }

  private static isNumeric(str: string) {
    if (typeof str != "string") return false;
    return (
      !isNaN(<any>str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
      !isNaN(parseFloat(str))
    ); // ...and ensure strings of whitespace fail
  }
}

const Options: OptionsType = new DefaultOptions();

const parser = new OptionsParser();
parser.initializeOptions();

export default Options;
