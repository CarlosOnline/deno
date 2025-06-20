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
  params: { [key: string]: string } = {};
  headers: { [key: string]: string } = {};
  payload?: string;
  rawPayload?: boolean;
  original?: string;

  get url() {
    return Url.getFetchUrl(this);
  }

  constructor(
    method: string,
    hostUrl: string,
    url: string,
    headers?: { [key: string]: string },
    payload?: string,
    rawPayload?: boolean,
    original?: string
  ) {
    this.method = method;
    this.hostUrl = hostUrl?.replace(/\/$/, "") || Url.getHostUrl(url);
    this.endpoint = Url.getEndpoint(url);
    this.params = Url.getParams(url);
    this.headers = headers || {};
    this.rawPayload = rawPayload || false;
    this.payload = this.getPayload(payload);
    this.original = original;
  }

  private getPayload(payload?: string) {
    if (!payload) return undefined;

    if (this.rawPayload) {
      return payload.replaceAll("\\\\n", "\\n").replaceAll("\\n", "\n");
    }

    return parseJson(payload);
  }
}
