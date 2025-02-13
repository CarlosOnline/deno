// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import { SwaggerParser, SwaggerDef } from "./swagger-parser.ts";
import * as _ from "lodash";
const orderBy = _.default.orderBy;
const groupBy = _.default.groupBy;

export type SwaggerEndpoint = {
  method: string;
  endpointCategory: string;
  controller: string;
  endpoint: string;
  operationId: string;
  parameters: any[];
};

export type SwaggerParameter = {
  name: string;
  type: string;
  required: boolean;
};

function toSwaggerParameter(param: any): SwaggerParameter {
  return {
    name: param.name,
    type: param.schema.type,
    required: param.required,
  };
}

export class Swagger {
  public parse(filePath: string) {
    const parser = new SwaggerParser();
    const swagger = parser.parseSwaggerFile(filePath);
    const endpoints = this.extractEndPoints(swagger);
    const results = orderBy(
      endpoints,
      ["controller", "endpoint", "method"],
      ["asc", "asc", "asc", "asc"]
    );
    return results;
  }

  public groupByCategory(endpoints: SwaggerEndpoint[]) {
    return groupBy(
      endpoints,
      (item: SwaggerEndpoint) => `${item.endpointCategory}-${item.method}`
    );
  }

  private extractEndPoints(swagger: SwaggerDef): SwaggerEndpoint[] {
    const endpoints: SwaggerEndpoint[] = [];
    for (const key in swagger.paths) {
      const endpoint = swagger.paths[key];
      for (const method in endpoint) {
        const methodInfo = endpoint[method];
        const operationId = methodInfo.operationId;
        const controller = methodInfo.tags[0];
        endpoints.push({
          method: method,
          endpointCategory: key.replace(/\/v[0-9]+\//g, "/vX/"),
          controller: controller,
          endpoint: key,
          operationId: operationId,
          parameters: methodInfo.parameters?.map((param) =>
            toSwaggerParameter(param)
          ),
        });
      }
    }
    return endpoints;
  }
}
