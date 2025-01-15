// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import { ParsedQuery } from "query-string";

export type YargsObj = {
  [x: string]: unknown;
  _: string[];
  $0: string;
};

export type RequestBodyType =
  | "text/plain"
  | "application/json"
  | "application/x-www-form-urlencoded"
  | "multipart/form-data";

export interface RequestBody {
  type: RequestBodyType;
  raw: boolean;
  data: any;
}

export interface ParsedCURL {
  /** url */
  url: string;
  /** query */
  query: ParsedQuery;
  /** request method uppercase */
  method: string;
  /** request header ...... includes cookies */
  headers: {
    [props: string]: string;
  };
  /** request body ...... parsed */
  body: RequestBody;
}
