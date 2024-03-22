import { command } from "../support/index.ts";
import Options from "../support/options.ts";
import { logger } from "../utility/index.ts";
import Utility from "../utility/utility.ts";

type FolderSize = {
  size: number;
  sizeStr: string;
  folder: string;
};

export default class SystemCommands {
  @command("folder-size", "Get size of folders", [
    "folder-size c:\\temp --folders --size 30KB",
    "folder-size c:\\temp --folders --size 100GB",
    "folder-size c:\\temp --folders --size 1048576",
  ])
  async folderSize(folder = Deno.cwd()) {
    const minSize = Utility.file.fileSizeToSize(Options.size || 0);
    const tasks = [getFolderSize(folder)];

    if (Options.folders) {
      const folders = Utility.file.listDirectories(folder);
      const folderTasks = folders.map(
        async (folder) => await getFolderSize(folder, true)
      );
      tasks.splice(folders.length, 0, ...folderTasks);
    }

    const sizes = await Promise.all(tasks);

    // Sum up initial folder size
    if (Options.folders) {
      const total = sizes
        .map((item) => item.size)
        .reduce((total, current) => total + current);

      sizes.push({
        size: total,
        sizeStr: Utility.file.formatFileSize(total),
        folder: folder,
      });
    }

    sizes
      .sort(sortFileSizes)
      .filter((item) => item.size > 0 && item.size >= minSize)
      .forEach((item) => {
        logger.info(`${item.sizeStr.padStart(10)}     ${item.folder}`);
      });

    async function getFolderSize(
      folder: string,
      recursive = false
    ): Promise<FolderSize> {
      const size = await Utility.file.folderSize(folder, recursive);
      if (Options.verbose) {
        logger.info(
          `${Utility.file.formatFileSize(size).padEnd(15)} ${folder}`
        );
      }

      return {
        size: size,
        sizeStr: Utility.file.formatFileSize(size, 0),
        folder: folder,
      };
    }

    function sortFileSizes(left: FolderSize, right: FolderSize) {
      return right.size - left.size;
    }
  }

  @command("remove-empty-dirs", "Remove empty folders")
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
