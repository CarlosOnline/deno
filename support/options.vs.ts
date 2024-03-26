// deno-lint-ignore-file no-explicit-any
import { dirname } from "https://deno.land/std/path/mod.ts";
import { logger, Utility } from "../utility/index.ts";

/*
Typical found paths:
C:\Program Files (x86)\Microsoft Visual Studio\2019\Professional\MSBuild\Current\Bin\MSBuild.exe
C:\Program Files (x86)\Microsoft Visual Studio\2019\Professional\MSBuild\Current\Bin\amd64\MSBuild.exe
C:\Program Files (x86)\Microsoft Visual Studio\2019\Professional\Common7\Tools\VsDevCmd.bat
*/
const visualStudioFolders = [
  "{drive}\\{programFiles}\\Microsoft Visual Studio\\{year}\\{flavor}\\Common7\\IDE",
  "{drive}\\{programFiles}\\Microsoft Visual Studio\\{year}\\{flavor}\\Common7\\Tools",
  "{drive}\\{programFiles}\\Microsoft Visual Studio\\{year}\\{flavor}\\MSBuild\\Current\\Bin",
  "{drive}\\{programFiles}\\Microsoft Visual Studio\\{year}\\{flavor}\\MSBuild\\7.0\\Bin",
];

const drives = ["C:", "D:", "E:"];
const programFilesFolders = ["Program Files", "Program Files (x86)"];
const files = ["msbuild.exe", "devenv.com", "VsMSBuildCmd.bat", "VsDevCmd.bat"];
const flavors = ["Community", "Professional", "Enterprise"];
const startYear = new Date().getFullYear();
const years = Array.from(
  { length: startYear - 2010 },
  (item, index) => startYear - index
);

export class VisualStudioOptions {
  [index: string]: any;
  msbuild = "";
  devenv = "";
  vsmsbuildcmd = "";
  vsdevcmd = "";
}

const DefaultVisualStudioOptions = {
  msbuild: "",
  devenv: "",
  vsmsbuildcmd: "",
  vsdevcmd: "",
};

type VisualStudioData = {
  drive: string;
  programFiles: string;
  year: number;
  flavor: string;
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
    let options = this.loadOptions();
    if (options) {
      return options;
    }

    const vsData = this.findVisualStudioFolder();
    if (!vsData) {
      logger.error("Failed to find Visual Studio folder");
      return Object.assign({}, DefaultVisualStudioOptions);
    }

    options = this.locateVisualStudioFiles(vsData);

    this.saveOptions(options);
    return options;
  }

  private locateVisualStudioFiles(vsData: VisualStudioData) {
    const options = new VisualStudioOptions();

    files.forEach((fileName) => {
      const key = fileName.split(".")[0];

      for (let idx = 0; idx < visualStudioFolders.length; idx++) {
        const folder = visualStudioFolders[idx]
          .replace("{drive}", vsData.drive)
          .replace("{programFiles}", vsData.programFiles)
          .replace("{year}", vsData.year.toString())
          .replace("{flavor}", vsData.flavor);

        const filePath = `${folder}\\${fileName}`;

        if (fileExists(filePath)) {
          options[key.toLocaleLowerCase()] = filePath;
          break;
        }
      }
    });

    return options;
  }

  private findVisualStudioFolder() {
    const folders = this.getVisualStudioFolders();

    const searchFolder = visualStudioFolders[0];
    while (true) {
      const vsData = <VisualStudioData>folders.next().value;
      if (!vsData) {
        return null;
      }

      const folder = searchFolder
        .replace("{drive}", vsData.drive)
        .replace("{programFiles}", vsData.programFiles)
        .replace("{year}", vsData.year.toString())
        .replace("{flavor}", vsData.flavor);

      if (directoryExists(folder)) {
        return vsData;
      }
    }
  }

  private getVisualStudioFolders = function* (): Generator<VisualStudioData> {
    for (let idx = 0; idx < drives.length; idx++) {
      const drive = drives[idx];
      {
        for (let idx = 0; idx < programFilesFolders.length; idx++) {
          const programFiles = programFilesFolders[idx];

          {
            for (let idx = 0; idx < years.length; idx++) {
              const year = years[idx];

              {
                for (let idx = 0; idx < flavors.length; idx++) {
                  const flavor = flavors[idx];

                  yield {
                    drive: drive,
                    programFiles: programFiles,
                    year: year,
                    flavor: flavor,
                  };
                }
              }
            }
          }
        }
      }
    }
  };

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

      const folder = dirname(filePath);
      if (!directoryExists(folder)) {
        Deno.mkdirSync(folder);
      }

      Utility.file.writeTextFile(filePath, json);
    }
  }
}
