import { command } from "../support/index.ts";
import { logger } from "../utility/index.ts";
import Utility from "../utility/utility.ts";

export default class VisualStudioCommands {
  @command("clean_obj_dirs", "Clean obj bin .vs folders")
  cleanObjDirs(folder = Deno.cwd(), confirmDelete = false) {
    console.log("Searching", folder);

    const objDirs = Utility.file
      .listDirectories(folder, true)
      .filter(
        (item) =>
          item.endsWith("\\bin") ||
          item.endsWith("\\obj") ||
          item.endsWith("\\.vs") ||
          item.endsWith("/bin") ||
          item.endsWith("/obj") ||
          item.endsWith("/.vs")
      );

    if (!objDirs.length) {
      return;
    }

    objDirs.forEach((item) => {
      console.log(item);
    });
    console.log("");

    const proceed =
      !confirmDelete || confirm(`Remove ${objDirs.length} folders`);

    if (proceed) {
      objDirs.forEach((objFolder) => {
        try {
          Deno.removeSync(objFolder, { recursive: true });
        } catch (err) {
          logger.error(`Failed to delete ${objFolder} - ${err}`);
        }
      });
    }
  }
}
