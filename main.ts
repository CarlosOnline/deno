import RestCommands from "./rest/commands.ts";
import { ActionRunner } from "./support/actions.ts";
import Options from "./support/options.ts";

new RestCommands();

if (!Options.args.length) {
  console.error("Missing action");
  Deno.exit(1);
}

const action = Options.args[0];
await ActionRunner.run(action);
