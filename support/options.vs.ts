// deno-lint-ignore-file no-explicit-any
import { dirname } from "https://deno.land/std/path/mod.ts";

import Utility from "../utility/utility.ts";

/*
Typical found paths:
C:\Program Files (x86)\Microsoft Visual Studio\2019\Professional\MSBuild\Current\Bin\MSBuild.exe
C:\Program Files (x86)\Microsoft Visual Studio\2019\Professional\MSBuild\Current\Bin\amd64\MSBuild.exe
C:\Program Files (x86)\Microsoft Visual Studio\2019\Professional\Common7\Tools\VsDevCmd.bat
*/
const searchFolders = [
  "{drive}\\{programFiles}\\Microsoft Visual Studio\\{year}\\{flavor}\\Common{version}\\IDE",
  "{drive}\\{programFiles}\\Microsoft Visual Studio\\{year}\\{flavor}\\Common{version}\\Tools",
  "{drive}\\{programFiles}\\Microsoft Visual Studio\\{year}\\{flavor}\\MSBuild\\Current\\Bin",
  "{drive}\\{programFiles}\\Microsoft Visual Studio\\{year}\\{flavor}\\MSBuild\\{version}.0\\Bin",
];

const flavors = ["Community", "Professional", "Enterprise"];
const programFilesFolders = ["Program Files", "Program Files (x86)"];
const drives = ["C:", "D:", "E:"];
const files = ["msbuild.exe", "devenv.com", "VsMSBuildCmd.bat", "VsDevCmd.bat"];

export class VisualStudioOptions {
  [index: string]: any;
  msbuild = "";
  devenv = "";
  vsmsbuildcmd = "";
  vsdevcmd = "";
}

type SearchData = {
  drive: string;
  programFiles: string;
  year: number;
  flavor: string;
  version: number;
};

type FindResults = {
  filePath: string;
  search: SearchData;
};

function fileExists(filePath: string) {
  try {
    const results = Deno.statSync(filePath);
    return results.isFile;
  } catch {
    return false;
  }
}

function directoryExists(filePath: string) {
  try {
    const results = Deno.statSync(filePath);
    return results.isDirectory;
  } catch {
    return false;
  }
}

export class VisualStudioOptionsBuilder {
  getOptions() {
    const foundOptions = this.loadOptions();
    if (foundOptions) {
      return foundOptions;
    }

    const options = new VisualStudioOptions();
    this.findFiles(options);
    return options;
  }

  private findFiles(options: VisualStudioOptions) {
    let searchData: SearchData | null = null;
    let found: FindResults | null = null;

    files.forEach((fileName) => {
      const key = fileName.split(".")[0];

      // Try finding with previously found data
      if (searchData) {
        found = this.searchInFolders(fileName, searchData);
      }

      if (!found) {
        // Search all years, versions, drives etc
        found = this.findFile(fileName);
      }

      if (found?.search) {
        searchData = found.search;
      }

      options[key.toLocaleLowerCase()] = found?.filePath;
    });

    this.saveOptions(options);
  }

  private loadOptions() {
    const scriptFolder = dirname(Deno.mainModule.replace("file:///", ""));
    const filePath = `${scriptFolder}/env/options.vs.json`;
    if (!fileExists(filePath)) {
      return null;
    }

    const decoder = new TextDecoder("utf-8");
    const data = Deno.readFileSync(filePath);
    const json = decoder.decode(data);

    try {
      return <VisualStudioOptions>JSON.parse(json);
    } catch {
      return null;
    }
  }

  private saveOptions(options: VisualStudioOptions) {
    const missing = Object.keys(options).filter((key) => !options[key]);
    if (missing.length == 0) {
      const scriptFolder = dirname(Deno.mainModule.replace("file:///", ""));
      const filePath = `${scriptFolder}/env/options.vs.json`;

      const json = JSON.stringify(options, null, 2);
      const encoder = new TextEncoder();
      const data = encoder.encode(json);

      const folder = dirname(filePath);
      if (!directoryExists(folder)) {
        Deno.mkdirSync(folder);
      }

      Deno.writeFileSync(filePath, data);
    }
  }

  private searchInFolders(fileName: string, searchData: SearchData) {
    for (let idx = 0; idx < searchFolders.length; idx++) {
      const folder = searchFolders[idx];
      const found = this.searchInFolder(fileName, folder, searchData);
      if (found) {
        return found;
      }
    }

    return null;
  }

  private searchInFolder(
    fileName: string,
    searchFolder: string,
    searchData: SearchData
  ) {
    const folder = searchFolder
      .replace("{drive}", searchData.drive)
      .replace("{programFiles}", searchData.programFiles)
      .replace("{year}", searchData.year.toString())
      .replace("{flavor}", searchData.flavor)
      .replace("{version}", searchData.version.toString());

    const filePath = `${folder}\\${fileName}`;

    return !fileExists(filePath)
      ? null
      : {
          filePath: filePath,
          search: searchData,
        };
  }

  private findFile(fileName: string) {
    for (let idxDrive = 0; idxDrive < fileName.length; idxDrive++) {
      const drive = drives[idxDrive];
      for (
        let idxProgramFiles = 0;
        idxProgramFiles < programFilesFolders.length;
        idxProgramFiles++
      ) {
        const programFiles = programFilesFolders[idxProgramFiles];
        const startYear = new Date().getFullYear();
        for (let year = startYear; year >= 2010; year--) {
          for (let version = 7; version <= 7; version++) {
            // Only version 7 is supported
            for (let idxFlavor = 0; idxFlavor < flavors.length; idxFlavor++) {
              const flavor = flavors[idxFlavor];
              const search: SearchData = {
                drive: drive,
                programFiles: programFiles,
                year: year,
                flavor: flavor,
                version: version,
              };

              const found = this.searchInFolders(fileName, search);
              if (found) {
                return found;
              }
            }
          }
        }
      }
    }
    return null;
  }
}
