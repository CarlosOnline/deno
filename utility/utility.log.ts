// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import { red, bold, cyan, yellow } from "https://deno.land/std/fmt/colors.ts";
import { Utility } from "./utility.ts";

export class Log {
  static trace(...args: any[]) {
    const message = args.join(" ");
    const text = new TextEncoder().encode(message);
    Deno.stdout.writeSync(text);
  }

  static info(...args: any[]) {
    const message = args.join(" ");
    console.log(cyan(message));
  }

  static highlight(...args: any[]) {
    const message = args.join(" ");
    console.log(bold(yellow(message)));
  }

  static warn(...args: any[]) {
    const message = args.join(" ");
    console.log(bold(yellow(message)));
  }

  static error(...args: any[]) {
    const message = args.join(" ");
    //Events.emit(Events.Error, message);
    console.error(bold(red(message)));
  }

  static fatal(...args: any[]) {
    Utility.log.error(args);
    //Events.emit(Events.FatalError, message);
    Deno.exit(-1);
    throw "Fatal";
  }
}

export const logger = Log;
