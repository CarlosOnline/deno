import { action } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger } from "../utility/index.ts";
import Utility from "../utility/utility.ts";
import { Git } from "./index.ts";

export default class GitCommands {
  @action("git.merge_from_develop,git.mfd", "Merge from develop")
  mergeFromDevelop() {
    const folder = Options.folder || Deno.cwd();

    const git = new Git();
    const info = git.info(folder);
    if (!info) {
      logger.error(`Not a git repository for ${folder}`);
      return;
    }

    if (Options.reset) {
      Utility.run(Options.git.cmd, "reset --hard".split(" "), folder);
    }

    git.mergeFromBranch(info.develop, folder);
  }
}
