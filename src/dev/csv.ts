// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import Papa from "papaparse";
import { Utility } from "../utility/index.ts";

export class Csv {
  parseCsv(filePath: string): string[][] {
    const csv = Utility.file.readTextFile(filePath);
    const parsed = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
      delimiter: ",",
      dynamicTyping: true,
    });

    return <any>parsed.data;
  }
}
