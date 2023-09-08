import GitCommands from "./git/commands.ts";
import Options from "./support/options.ts";
import RestCommands from "./rest/commands.ts";
import TestCommands from "./test.ts";
import { ActionRunner } from "./support/actions.ts";
import VisualStudioCommands from "./vs/commands.ts";

new GitCommands();
new RestCommands();
new TestCommands();
new VisualStudioCommands();

if (!Options.args.length) {
  console.error("Missing action");
  Deno.exit(1);
}

const action = Options.args[0];
await ActionRunner.run(action);
