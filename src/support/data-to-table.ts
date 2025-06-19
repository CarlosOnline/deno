type Data = {
  [key: string]: number;
};

type ColorFunction = (value: string) => string;
type Formats = {
  [key: string]: ColorFunction;
};

export class DataToTable {
  static toTable(table: Dict[], formats: Formats = {}): string {
    if (!table || table.length === 0) {
      return "";
    }

    const stats = DataToTable.getStats(table);
    const keys = Object.keys(stats);
    const header = keys.map((key) => key.padEnd(stats[key])).join(" | ");
    const separator = keys.map((key) => "-".repeat(stats[key])).join("-|-");
    const rows = table.map((item) =>
      keys
        .map((key) => DataToTable.getValue(item[key], stats[key], formats[key]))
        .join(" | ")
    );

    return [header, separator, ...rows].join("\n");
  }

  static toCsv(table: Dict[]): string {
    if (!table || table.length === 0) {
      return "";
    }
    const stats = DataToTable.getStats(table);
    const keys = Object.keys(stats);
    const header = keys.map((key) => key.padEnd(stats[key])).join(" , ");
    const separator = keys.map((key) => "-".repeat(stats[key])).join(" , ");
    const rows = table.map((item) =>
      keys.map((key) => String(item[key] ?? "").padEnd(stats[key])).join(" , ")
    );

    return [header, separator, ...rows].join("\n");
  }

  static toCsvRaw(table: Dict[]): string {
    if (!table || table.length === 0) {
      return "";
    }
    const stats = DataToTable.getStats(table);
    const keys = Object.keys(stats);
    const rows = table.map((item) =>
      keys.map((key) => String(item[key] ?? "").padEnd(stats[key])).join(" , ")
    );

    return rows.join("\n");
  }

  private static getStats(table: Dict[]): Data {
    const keys = Array.from(
      new Set(table.map((item) => Object.keys(item)).flat())
    );

    const lengths: Data = {};

    for (const key of keys) {
      let length = 0;
      table.forEach((item) => {
        if (item[key] !== undefined && item[key] !== null) {
          length = Math.max(length, String(item[key]).length);
        }
      });

      lengths[key] = length;
    }

    return lengths;
  }

  private static getValue(
    value: string,
    length: number,
    format: ColorFunction
  ): string {
    value = (value || "").padEnd(length);

    if (format) {
      value = format(value);
    }

    return value;
  }
}
