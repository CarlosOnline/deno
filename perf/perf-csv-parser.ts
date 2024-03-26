import Papa from "papaparse";
import { Utility } from "../utility/index.ts";

export class PerfCsvParser {
  parseCsv(filePath: string): string[][] {
    const csv = Utility.file.readTextFile(filePath);
    const parsed = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
      delimiter: ",",
      dynamicTyping: true,
    });
    return parsed.data;
  }
}
