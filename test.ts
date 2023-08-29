// deno-lint-ignore-file no-explicit-any
import { Git } from "./git/index.ts";
import { action } from "./support/index.ts";
import Options from "./support/options.ts";
import Utility from "./utility/utility.ts";

export default class TestCommands {
  @action("tests", "Tests")
  static async Run() {
    const repoFolder = "e:/samples/deno2";
    const repoFolder3 = "e:/samples/MSBuild.Sdk.SqlProj";

    let output: any = "";
    const git = new Git();

    TestCommands.mergeFromDevelop(repoFolder3);

    const repos = git.listRepos("e:/samples");
    //console.log("repos", repos);

    repos.slice(0, 2).forEach((folder) => {
      const info = git.info(folder);
      if (!info) {
        return;
      }

      if (info.remotes.length <= 1) return;
      console.log("info", folder, info.remotes);
    });

    await console.log("done");
    await Deno.exit();
  }

  test2() {
    const repoFolder = "e:/samples/deno2";

    let output: any = "";
    const git = new Git();

    output = git.remoteBranches();
    console.log("remoteBranches", output);

    output = git.info();
    console.log("info", output);

    output = git.defaultBranch();
    console.log("default", output);

    output = git.status(repoFolder);
    console.log("status", repoFolder, output);

    output = git.status();
    console.log("status2", output);

    output = git.branch();
    console.log("branch", output);

    git.isRepo("e:/dev/deno");
    console.log(git.config("e:/dev/deno"));
  }

  private static mergeFromDevelop(folder: string) {
    const git = new Git();
    const info = git.info(folder);
    if (!info) return;
    //console.log(info);

    Utility.run(Options.git.cmd, "reset --hard".split(" "), folder);

    git.mergeFromBranch(info.develop, folder);
  }
}
