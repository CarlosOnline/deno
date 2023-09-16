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

    await TestCommands.mergeFromDevelop(repoFolder3);

    const repos = git.listRepos("e:/samples");
    //console.log("repos", repos);

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

    console.log(git.config("e:/dev/deno"));
  }

  private static async mergeFromDevelop(folder: string) {
    const git = new Git();
    const info = await git.info(folder);
    if (!info) return;
    //console.log(info);

    Utility.run.run(Options.git.cmd, "reset --hard".split(" "), folder);

    git.mergeFromBranch(info.develop, folder);
  }
}
