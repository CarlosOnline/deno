import Options from "../support/options.ts";
import { logger, UrlInfo } from "./index.ts";

export type FetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  error?: string | null;
  body?: string | null;
  bodyLength?: number | undefined;
};

export class Url {
  static parseUrl(
    method: string,
    url: string,
    headers?: string,
    payload?: string
  ): UrlInfo {
    return new UrlInfo(method, url, headers, payload);
  }

  static async fetch(endpoint: UrlInfo, token: string): Promise<FetchResponse> {
    const response: FetchResponse = {
      ok: false,
      status: 500,
      statusText: "Unknown error",
      error: "Unknown error",
    };

    if (Options.test || Options.dryRun) {
      return response;
    }

    const headers = getHeaders();

    const params = {
      method: endpoint.method,
      headers: headers,
      body: endpoint.payload ? JSON.stringify(endpoint.payload) : undefined,
    };

    const url = Url.getFetchUrl(endpoint);
    if (Options.verbose) {
      logger.info(`Fetch ${url}`);
    }

    try {
      await fetch(url, params);
      const resp = await fetch(url, params);

      response.ok = resp.ok;
      response.status = resp.status || 500;
      response.statusText = resp.statusText || "Unknown error";

      if (Options.verbose) {
        logger.info(
          `Fetch ${resp.ok} ${resp.status} ${resp.statusText} ${url}`
        );
      }

      if (resp.ok) {
        const body = await resp.text();
        const responseContentType = resp.headers.get("Content-Type") || "";
        if (responseContentType) {
          response.error = body?.length > 0 ? null : "Empty body";
        } else {
          response.error = "";
        }

        response.body = body;
        response.bodyLength = body?.length;
      } else {
        logger.error(
          `Fetch failed ${resp.status} ${resp.statusText} for ${url}`
        );
      }
    } catch (error) {
      logger.error(`Fetch failed ${error} for ${url}`);
      response.error =
        error.toString().replace(/,/g, "-") || "Unknown exception";
    }

    return response;

    function getHeaders() {
      const headers = endpoint.headers || {};
      if (endpoint.payload && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      return headers;
    }
  }

  static getHostUrl(url: string) {
    const pattern = /(?<hostUrl>https?:\/\/[^/]+)\/.*/;
    const match = url.match(pattern);
    return match?.groups?.hostUrl || "";
  }

  static getEndpoint(url: string) {
    const hostUrl = Url.getHostUrl(url);
    if (!hostUrl) return "";

    return url.replace(hostUrl + "/", "").split("?")[0];
  }

  static getEndpointDisplay(url: string) {
    const parts = url.split("?")[0].split("/");
    return parts[parts.length - 1];
  }

  static getParams(url: string): Dict {
    const parts = url.split("?");
    if (parts.length == 1) return {};

    const params: Dict = {};
    const paramsParts = parts[1].split("&");
    paramsParts.forEach((param) => {
      const keyValue = param.split("=");
      params[keyValue[0].trim()] = decodeURIComponent(keyValue[1].trim());
    });

    return params;
  }

  static getHeaders(value: string) {
    const headers: Dict = {};
    if (!value) return headers;

    (value?.split("-H") || [])
      .filter((item) => item.trim().length > 0)
      .map((item) => item.replace(/'/g, "").trim())
      .map((item) => item.split(":"))
      .filter((item) => item.length == 2)
      .forEach((item) => {
        headers[item[0].trim()] = item[1].trim();
      });
    return headers;
  }

  static getFetchUrl(endpoint: UrlInfo) {
    const params = Object.keys(endpoint.params)
      .map((key) => `${key}=${encodeURIComponent(endpoint.params[key])}`)
      .join("&");

    const paramUrl = params ? `?${params}` : "";

    const hostUrl = endpoint.hostUrl;
    return hostUrl + "/" + endpoint.endpoint + paramUrl;
  }
}
