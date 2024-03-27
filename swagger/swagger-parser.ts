// deno-lint-ignore-file no-explicit-any
import { Utility } from "../utility/index.ts";

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
}
