import {
  red,
  bold,
  italic,
  cyan,
  yellow,
} from "https://deno.land/std/fmt/colors.ts";

import Path from "./utility.path.ts";

export default class Utility {
  static path = Path;

  static info(...args: any[]) {
    const message = args.join(" ");
    console.log(cyan(message));
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
    Utility.error(args);
    //Events.emit(Events.FatalError, message);
    Deno.exit(-1);
  }
}
