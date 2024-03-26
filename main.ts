import { CommandRunner } from "./support/commands.ts";
import { logger } from "./utility/index.ts";
import Options from "./support/options.ts";

import CurlCommands from "./curlTests/commands.ts";
import DevCommands from "./dev/commands.ts";
import GitCommands from "./git/commands.ts";
import MvnCommands from "./mvn/commands.ts";
import PerfCommands from "./perf/commands.ts";
import SqlCommands from "./sql/commands.ts";
import SystemCommands from "./system/commands.ts";
import TestCommands from "./test.ts";
import VisualStudioCommands from "./vs/commands.ts";

new CurlCommands();
new DevCommands();
new GitCommands();
new MvnCommands();
new PerfCommands();
new SqlCommands();
new SystemCommands();
new TestCommands();
new VisualStudioCommands();

if (!Options.args.length) {
  logger.error("Missing action");
  CommandRunner.usage();
  Deno.exit(1);
}

const action = Options.args[0];
await CommandRunner.run(action);
