import RestCommands from "./rest/commands.ts";
import Options from "./support/options.ts";

const commands = new RestCommands();

if (!Options.args.length) {
  console.error("Missing action");
  Deno.exit(1);
}

switch (Options.args[0]) {
  case "token": {
    await commands.getToken();
    break;
  }

  default:
    console.error("Unknown action", Options.args[0]);
}
