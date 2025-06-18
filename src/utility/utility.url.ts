// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import Options from "../options/options.ts";
import { logger, UrlInfo } from "./index.ts";

export type FetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  error?: string;
  errorMessage?: string;
  headers?: Headers;
  body?: string | null;
  bodyLength?: number | undefined;
};

export class Url {
  static async fetch(endpoint: UrlInfo, token: string): Promise<FetchResponse> {
    const response: FetchResponse = {
      ok: false,
      status: 500,
      statusText: "Unknown error",
      error: "Unknown error",
    };

    const headers = getHeaders();

    const payload = Url.getPayload(endpoint);

    const params = {
      method: endpoint.method,
      headers: headers,
      body: payload || undefined,
    };

    if (Options.test || Options.dryRun) {
      return {
        ok: true,
        status: 200,
        statusText: "Dry Run",
        error: "",
      };
    }

    const url = Url.getFetchUrl(endpoint);
    if (Options.verbose) {
      logger.info(`Fetch ${url}`);
      console.log(endpoint);
      console.log(params);
    }

    try {
      const resp = await fetch(url, params);

      response.ok = resp.ok;
      response.headers = resp.headers;
      response.status = resp.status || 500;
      response.statusText = resp.statusText || "Unknown error";

      if (Options.verbose) {
        logger.info(
          `Fetch ${resp.ok} ${resp.status} ${resp.statusText} ${url}`
        );
      }

      const body = await getBodyFromResponse(resp);

      if (resp.status == 204) {
        response.error = "";
      } else if (resp.ok) {
        const responseContentType = resp.headers.get("Content-Type") || "";
        if (responseContentType) {
          response.error = body?.length > 0 ? "" : "Empty body";
        } else {
          response.error = "";
        }

        response.body = body;
        response.bodyLength = body?.length;
      } else {
        response.error = body || resp.statusText || "Unknown error";
      }
    } catch (error: any) {
      response.error =
        error.toString().replace(/,/g, "-") || "Unknown exception";
    }

    response.errorMessage = Url.getErrorMessage(response.error);

    if (response.error) {
      if (Options.verbose) {
        logger.error(
          `\nFetch failed ${response.status} ${response.statusText} for ${endpoint.method} ${endpoint.url}\n${endpoint.original}\nError: ${response.errorMessage}`
        );
      } else {
        logger.error(
          `\nFetch failed ${response.status} ${response.statusText} for ${
            endpoint.method
          } ${url.substring(0, 120)}\nError: ${response.errorMessage}`
        );
      }
    }

    return response;

    function getHeaders() {
      const headers = endpoint.headers || {};

      if (endpoint.payload && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }

      if (!Options.skipAuth && token && token != "none") {
        headers["Authorization"] = `Bearer ${token}`;
      }
      return headers;
    }

    async function getBodyFromResponse(response: Response) {
      try {
        if (response.status == 204) {
          return "";
        }

        return await response.text();
      } catch (error) {
        logger.error(`Failed to get body from response ${error}`);
      }
      return "";
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

  static getParams(url: string): { [key: string]: string } {
    const parts = url.split("?");
    if (parts.length == 1) return {};

    const params: { [key: string]: string } = {};
    const paramsParts = parts[1].split("&");
    paramsParts.forEach((param) => {
      const keyValue = param.split("=");
      params[keyValue[0].trim()] = decodeURIComponent(keyValue[1].trim());
    });

    return params;
  }

  static getHeaders(value: string) {
    const headers: { [key: string]: string } = {};
    if (!value) return headers;

    (value?.split("-H") || [])
      .filter((item) => item.trim().length > 0)
      .map((item) => item.replace(/'/g, "").trim())
      .forEach((item) => {
        const idx = item.indexOf(":");
        if (idx == -1) return;
        const key = item.substring(0, idx).trim();
        const value = item.substring(idx + 1).trim();
        headers[key] = value;
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

  static getErrorMessage(error?: string) {
    if (!error) return "";

    try {
      const errorInfo = JSON.parse(error);
      return errorInfo.message || error;
    } catch {
      // ignored
    }

    return error;
  }

  private static getContentType(endpoint: UrlInfo): string {
    if (endpoint.headers["content-type"]) {
      return endpoint.headers["content-type"];
    }

    return "";
  }

  private static getPayload(endpoint: UrlInfo): string {
    const rawPayload = endpoint.rawPayload && endpoint.payload ? true : false;

    if (rawPayload) {
      return endpoint.payload || "";
    }

    return JSON.stringify(endpoint.payload);
  }
}
