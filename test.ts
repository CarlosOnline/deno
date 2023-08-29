import { Git } from "./git/index.ts";
import Utility from "./utility/utility.ts";

export default class Test {
  static async Run() {
    const repoFolder = "e:/samples/deno2";

    let output = "";
    const git = new Git();

    output = await git.status(repoFolder);
    console.log("results", output);

    output = await git.status();
    console.log("results", output);

    output = await git.branch();
    console.log("results", output);

    git.isRepo("e:/dev/deno");
    console.log(git.config("e:/dev/deno"));

    const folders = Utility.file.listDirectories("e:\\samples");
    console.log(folders);

    await console.log("done");
    await Deno.exit();
  }
}
