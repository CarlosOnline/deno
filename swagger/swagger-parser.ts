// deno-lint-ignore-file no-explicit-any
import Options from "../support/options.ts";
import { Url, Utility } from "../utility/index.ts";

export type SwaggerDef = {
  openApi: string;
  info: {
    title: string;
    version: string;
  };
  required: {
    title: string;
    version: string;
  };
  servers: {
    url: string;
    descripton: string;
  }[];
  paths: {
    [key: string]: {
      [key: string]: {
        summary: string;
        description: string;
        operationId: string;
        tags: string[];
        parameters: {
          name: string;
          in: string;
          required: boolean;
          schema: {
            minimum: number;
            type: number;
            format: string;
          };
        }[];
        requestBody: {
          content: any;
          required: boolean;
        };
        responses: {
          [key: string]: {
            description: string;
            content: any;
          };
        };
        security: {
          [key: string]: any;
        }[];
      };
    };
  };
};

export class SwaggerParser {
  parseSwaggerFile(filePath: string) {
    const content = Utility.file.readTextFile(filePath);
    const swagger: SwaggerDef = JSON.parse(content);
    return swagger;
  }

  async parseSwaggerUrl(urlPath: string) {
    const urlInfo = Url.parseUrl("GET", urlPath);
    const response = await Url.fetch(urlInfo, "");
    if (!response.ok || !response.body) {
      throw new Error(`Error fetching swagger: ${response.error}`);
    }

    const swagger: SwaggerDef = JSON.parse(response.body);
    return swagger;
  }

  async parseSwagger(path: string) {
    if (Utility.file.fileExists(path)) {
      return this.parseSwaggerFile(path);
    }

    if (path.startsWith("http")) {
      return await this.parseSwaggerUrl(path);
    }

    const appUrl = Options.apps[path]?.url;
    if (!appUrl) {
      throw new Error(`Invalid path: ${path}`);
    }

    return await this.parseSwaggerUrl(`${appUrl.replace(/\/$/g)}/v3/api-docs`);
  }
}
