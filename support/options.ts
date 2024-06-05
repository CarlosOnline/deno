// deno-lint-ignore-file no-explicit-any
import { dirname } from "https://deno.land/std/path/mod.ts";
import {
  VisualStudioOptions,
  VisualStudioOptionsBuilder,
} from "./options.vs.ts";
import {
  EnvironmentToken,
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
  env = "";
  scriptFolder = "";
  args: string[] = [];
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
  helm = "C:/ProgramData/chocoportable/bin/helm.exe";
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

  token?: EnvironmentToken = {
    token: "",
    target: "",
    url: "",
    body: [],
  };

  projects: { [key: string]: string } = {};
}

type OptionsType =
  | DefaultOptions
  | VisualStudioOptions
  | EnvironmentData
  | Record<string, any>;

class OptionsParser {
  public initializeOptions() {
    this.initializeScriptFolder();
    this.initializeVisualStudio();
    this.parseArgs(Deno.args);
    this.loadEnvironmentData(Options.env);
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

  private loadEnvironmentData(env: string) {
    if (!env) {
      return;
    }

    const filePath = `${Options.scriptFolder}/env/${env}`;
    const data = Deno.readFileSync(filePath);
    const decoder = new TextDecoder("utf-8");
    const contents = decoder.decode(data);
    const settings: EnvironmentData = JSON.parse(contents);
    Object.assign(Options, settings);
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
            Options[key] = nextArg;
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
