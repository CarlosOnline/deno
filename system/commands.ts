import { action } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger } from "../utility/index.ts";
import Utility from "../utility/utility.ts";

export default class SystemCommands {
  @action("remove-empty-dirs", "Remove empty folders")
  removeEmptyFolders(folder = Deno.cwd()) {
    const commands = new SystemCommands();

    const folders = Utility.file.listDirectories(folder);
    folders.forEach((item) => {
      commands.removeEmptyFolders(item);
    });

    if (commands.isEmptyFolder(folder)) {
      //logger.info(`dir /b /a-d "${folder.replace("/", "\\")}"`);

      if (!Options.test) {
        const contents = Utility.file.listDirectoryContents(folder, true);
        if (contents.length == 0) {
          logger.warn(`rd "${folder.replace("/", "\\")}"`);
          Deno.removeSync(folder);
        }
      }
    }
  }

  private isEmptyFolder(folder: string): boolean {
    const contents = Utility.file.listDirectoryContents(folder);
    if (contents.length > 0) {
      return false;
    }

    const folders = Utility.file.listDirectories(folder);
    if (folders.length == 0) {
      //console.log("EMPTY", folder);
      return true;
    }

    return folders.filter((item) => !this.isEmptyFolder(item)).length == 0;
  }
}
