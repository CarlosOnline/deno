// deno-lint-ignore-file no-explicit-any
import { dirname } from "https://deno.land/std/path/mod.ts";

export class DefaultOptions {
  [index: string]: any;
  // Environment file to load.
  env = "";
  scriptFolder = "";
  args: string[] = [];
  cwdBackup = Deno.cwd();
  git = {
    cmd: "C:/Program Files/Git/cmd/git.exe",
    mainBranches: ["main", "master", "develop"],
    develop: "develop",
  };
  chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  sqlcmd =
    '"C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\170\\Tools\\Binn\\SQLCMD.EXE"';
  sql = {
    server: "Default Server",
    database: "Default Database",
  };
}

type OptionsType = DefaultOptions | Record<string, any>;

class OptionsParser {
  public initializeOptions() {
    this.initializeScriptFolder();
    this.parseArgs(Deno.args);
    this.loadEnvironmentData(Options.env);
  }

  private initializeScriptFolder() {
    const filePath = Deno.mainModule.replace("file:///", "");
    Options.scriptFolder = dirname(filePath);
  }

  private loadEnvironmentData(env: string) {
    if (!env) {
      return;
    }

    const filePath = `${Options.scriptFolder}/env/${env}`;
    const data = Deno.readFileSync(filePath);
    const decoder = new TextDecoder("utf-8");
    const contents = decoder.decode(data);
    const settings = JSON.parse(contents);
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

const Options: OptionsType = <any>new DefaultOptions();
const parser = new OptionsParser();
parser.initializeOptions();

export default Options;
