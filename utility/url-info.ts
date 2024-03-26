import Options from "../support/options.ts";
import { logger, Url } from "./index.ts";

function parseJson(payload?: string) {
  if (!payload) return null;

  try {
    return JSON.parse(payload);
  } catch (error) {
    logger.error(`Failed to parse payload ${error}\n${payload}\n`);
    return null;
  }
}

export class UrlInfo {
  method: string = "";
  hostUrl: string = "";
  endpoint: string = "";
  params: Dict = {};
  headers: Dict = {};
  payload?: string;

  get url() {
    return Url.getFetchUrl(this);
  }

  constructor(method: string, url: string, headers?: string, payload?: string) {
    this.method = method;
    this.hostUrl = Options.hostUrl?.replace(/\/$/, "") || Url.getHostUrl(url);
    this.endpoint = Url.getEndpoint(url);
    this.params = Url.getParams(url);
    this.headers = Url.getHeaders(headers || "");
    this.payload = parseJson(payload);
  }
}
