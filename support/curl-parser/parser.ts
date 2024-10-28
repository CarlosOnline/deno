// deno-lint-ignore-file no-explicit-any
import * as url from "node:url";
import * as yargsImp from "yargs";
const yargs = yargsImp.default();

import {
  YargsObj,
  ParsedCURL,
  RequestBodyType,
  RequestBody,
} from "./interface.ts";
//import * as multipart from "parse-multipart";

// Based on https://github.com/NickCarneiro/curlconverter/blob/master/util.js

export default class CurlParser {
  private cURLStr: string;
  private yargObj: YargsObj;

  constructor(cURLStr: string) {
    this.cURLStr = cURLStr;
    const yargObj = yargs.parse(this.pretreatment(cURLStr));
    this.yargObj = yargObj;
  }

  private pretreatment(cURLStr: string): string {
    if (!cURLStr.startsWith("curl")) {
      throw new Error("curl syntax error");
    }

    const newLineFound = /\r|\n/.exec(cURLStr);
    if (newLineFound) {
      cURLStr = cURLStr.replace(/\\\r|\\\n/g, "");
    }

    cURLStr = cURLStr.replace(/ -XPOST/, " -X POST");
    cURLStr = cURLStr.replace(/ -XGET/, " -X GET");
    cURLStr = cURLStr.replace(/ -XPUT/, " -X PUT");
    cURLStr = cURLStr.replace(/ -XPATCH/, " -X PATCH");
    cURLStr = cURLStr.replace(/ -XDELETE/, " -X DELETE");

    cURLStr = cURLStr.replace(/ --header/g, " -H");
    cURLStr = cURLStr.replace(/ --user-agent/g, " -A");
    cURLStr = cURLStr.replace(/ --request/g, " -X");
    cURLStr = cURLStr.replace(/ --data-raw/g, " -D");
    cURLStr = cURLStr.replace(/ --(data|data-binary|data-urlencode)/g, " -d");
    cURLStr = cURLStr.replace(/ --form/g, " -F");
    cURLStr = cURLStr.trim();

    cURLStr = cURLStr.replace(/^curl/, "");

    return cURLStr;
  }

  private getFirstItem(key: string): string {
    const e = this.yargObj[key];
    if (!Array.isArray(e)) {
      return e as string;
    }
    return e[e.length - 1] || "";
  }

  getUrl() {
    const yargObj = this.yargObj;
    let uri = "";
    uri = yargObj._[0];
    if (yargObj["url"]) {
      uri = yargObj["url"] as string;
    }
    if (!uri) {
      Object.values(yargObj).forEach((e) => {
        if (typeof e !== "string") {
          return;
        }
        if (e.startsWith("http") || e.startsWith("www.")) {
          uri = e;
        }
      });
    }
    return uri.replaceAll("'", "");
  }

  getQuery(uri: string) {
    const obj = url.parse(uri, true);
    return obj.query;
  }

  getHeaders(): ParsedCURL["headers"] {
    const yargObj = this.yargObj;
    const headers: ParsedCURL["headers"] = {};

    if (!Reflect.has(yargObj, "H")) {
      return headers;
    }

    let yargHeaders = yargObj["H"] as string[];
    if (!Array.isArray(yargHeaders)) {
      yargHeaders = [yargHeaders];
    }

    yargHeaders.forEach((item) => {
      const i = item.indexOf(":");
      const name = item.substring(0, i).trim().toLowerCase();
      const val = item.substring(i + 1).trim();
      headers[name] = val;
    });

    if (Reflect.has(yargObj, "A")) {
      headers["user-agent"] = this.getFirstItem("A");
    }

    return headers;
  }

  getMethods(): string {
    const yargObj = this.yargObj;
    let me = this.getFirstItem("X") || "GET";
    if (Reflect.has(yargObj, "d") || Reflect.has(yargObj, "F")) {
      me = "POST";
    }

    return me.toUpperCase();
  }

  getBody(headers: ParsedCURL["headers"]) {
    const contentType = headers["content-type"];
    let type: RequestBodyType = "text/plain";
    let data = this.yargObj["d"] as string;
    if (contentType) {
      if (contentType.indexOf("json") > -1) {
        type = "application/json";
      }
      if (contentType.indexOf("urlencoded") > -1) {
        type = "application/x-www-form-urlencoded";
      }

      if (this.cURLStr.indexOf(" --data-urlencoded") > -1) {
        type = "application/x-www-form-urlencoded";
      }
      if (Array.isArray(data) && type !== "application/x-www-form-urlencoded") {
        type = "application/x-www-form-urlencoded";
        data = (data as string[]).join("&");
      }

      if (this.yargObj["F"]) {
        type = "multipart/form-data";
      }

      if (contentType.indexOf("form-data") > -1) {
        throw new Error("form-data not support");
        /*
        type = "multipart/form-data";
        let boundary = "";
        const match = contentType.match("/boundary=.+/");
        if (!match) {
          type = "text/plain";
        } else {
          boundary = match[0].slice(9);
          try {
            const parts = multipart.parse(data, boundary);
            this.yargObj["F"] = parts.map((item) => {
              return `${item.name}=${item.data}`;
            });
          } catch (error: any) {
            type = "text/plain";
          }
        }
        */
      }
    } else {
      if (typeof data === "string" && data) {
        try {
          JSON.parse(data);
          type = "application/json";
        } catch (error: any) {
          console.error(error.message || error);
        }
      }
    }

    const rawData = this.yargObj["D"] as string;
    if (rawData) {
      const requestBody: RequestBody = {
        type,
        raw: true,
        data: rawData,
      };

      return requestBody;
    }

    let body: any = "";

    switch (type) {
      case "application/json":
        try {
          body = JSON.parse(data);
        } catch (error: any) {
          console.error(error.message || error);
          body = data;
        }
        break;
      case "application/x-www-form-urlencoded":
        //body = qs.parse(data);
        //break;
        throw new Error("application/x-www-form-urlencoded not support");
      case "multipart/form-data":
        throw new Error("multipart/form-data not support");
      /*
        if (this.yargObj["F"]) {
          const multipartUpload = {};
          let yargFrom = this.yargObj["F"] as string[];
          if (!Array.isArray(yargFrom)) {
            yargFrom = [yargFrom];
          }
          yargFrom.forEach((item) => {
            const arr = item.split("=");
            multipartUpload[arr[0]] = arr[1];
          });
          body = multipartUpload;
        } else {
        }
        break;
        */
      default:
        body = "";
        break;
    }

    const requestBody: RequestBody = {
      type,
      raw: false,
      data: body,
    };

    return requestBody;
  }

  parse() {
    const uri = this.getUrl();
    const headers = this.getHeaders();
    const ret: ParsedCURL = {
      url: uri,
      method: this.getMethods(),
      headers,
      query: this.getQuery(uri),
      body: this.getBody(headers),
    };

    return ret;
  }
}
