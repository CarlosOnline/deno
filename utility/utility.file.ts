export default class File {
  static listDirectories(folder: string): string[] {
    const results: string[] = [];

    for (const dirEntry of Deno.readDirSync(folder)) {
      if (dirEntry.isDirectory) {
        results.push(`${folder}/${dirEntry.name}`);
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
