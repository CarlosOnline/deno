// deno-lint-ignore-file no-explicit-any
import { Git } from "./git/index.ts";
import { action } from "./support/index.ts";
import Utility from "./utility/utility.ts";

export default class TestCommands {
  @action("tests", "Tests")
  static async Run() {
    const repoFolder = "e:/samples/deno2";

    let output: any = "";
    const git = new Git();

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

    await console.log("done");
    await Deno.exit();
  }
}
