export default class File {
  static listDirectories(folder: string, recursive = false) {
    const results: string[] = [];

    for (const dirEntry of Deno.readDirSync(folder)) {
      const entryPath = `${folder}/${dirEntry.name}`;

      if (dirEntry.isDirectory) {
        results.push(entryPath);

        if (recursive) {
          results.splice(
            results.length,
            0,
            ...File.listDirectories(entryPath, true)
          );
        }
      }
    }

    return results;
  }

  static readFile(filePath: string): string {
    const decoder = new TextDecoder("utf-8");
    const data = Deno.readFileSync(filePath);
    return decoder.decode(data);
  }
}
