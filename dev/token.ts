// deno-lint-ignore-file no-explicit-any
import { loadEnvironmentFile, TokenData } from "../support/options.ts";
import { logger, Utility } from "../utility/index.ts";
import Options from "../support/options.ts";

const OneSecondMs = 1000;
const OneMinuteMs = 60 * OneSecondMs;
const OneHourMs = 60 * OneMinuteMs;
const MaxDurationMs = OneHourMs;

const TokenFolder = "c:\\temp\\token";

type TokenCache = {
  timestamp: number;
  date: Date;
  token: string;
};

export type ServiceToken = {
  [key: string]: any;
  url: string;
  body: [string, string][];
  outputFilePath?: string;
};

export type ServiceEnvMap = {
  [key: string]: ServiceToken;
  dev: ServiceToken;
  qc: ServiceToken;
  uat: ServiceToken;
  prod: ServiceToken;
};

export type ServiceTokenMap = { [key: string]: ServiceEnvMap };

export default class Token {
  private static cache: TokenCache = {
    timestamp: 0,
    date: new Date(),
    token: "",
  };

  static async getToken(service: string = "", env: string = "", force = false) {
    const tokenService = new Token();
    const tokenData = tokenService.getTokenData(service, env);
    if (tokenData == null) {
      logger.fatal(`Missing token data for ${service}`);
      return;
    }

    return await tokenService.token(tokenData, force);
  }

  private async token(tokenData: ServiceToken, force = false) {
    if (!force) {
      const cachedToken = this.getCachedToken();
      if (cachedToken) {
        return cachedToken;
      }
    }

    if (Options.verbose) {
      console.log(tokenData);
    }

    const formBody: string[] = [];
    (<string[][]>(tokenData.body as any)).forEach((pair) => {
      const encodedKey = encodeURIComponent(pair[0]);
      const encodedValue = encodeURIComponent(pair[1]);
      formBody.push(encodedKey + "=" + encodedValue);
    });

    const formBodyJson = formBody.join("&");

    const resp = await fetch(tokenData.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBodyJson,
    });

    if (!resp.ok) {
      logger.error(
        `Fetch token failed ${resp.status} ${resp.statusText} for ${tokenData.url}`
      );
      return "";
    }

    const body = await resp.json();
    const token = body.access_token as string;

    this.saveToken(token);

    return token;
  }

  private getTokenData(service: string, env: string = "") {
    const serviceTokenMap = this.getServiceTokenMap();
    service = service || Object.keys(serviceTokenMap)[0];

    const serviceEnvMap = serviceTokenMap[service];
    if (!serviceEnvMap || Object.keys(serviceEnvMap).length == 0) {
      logger.fatal(`Missing service data for ${service} ${env}`);
      return null;
    }

    const serviceEnvs = Object.keys(serviceEnvMap);
    env = env || serviceEnvs[0];

    if (Options.verbose) {
      console.log(`get token data for ${service} ${env}`, serviceEnvMap[env]);
    }

    return serviceEnvMap[env];
  }

  private getServiceTokenMap() {
    const serviceTokenMap = loadEnvironmentFile<ServiceTokenMap>(
      Options.serviceTokenFile
    );

    if (Object.keys(serviceTokenMap).length == 0) {
      logger.fatal(`Missing service tokens for ${Options.serviceTokenFile}`);
    }

    return serviceTokenMap;
  }

  private saveToken(token: string) {
    const now = new Date();
    Token.cache.timestamp = now.getTime();
    Token.cache.date = now;
    Token.cache.token = token;

    Utility.path.ensure_directory(TokenFolder);

    const tokenFilePath = `${TokenFolder}\\token.json`;
    Utility.file.writeTextFile(tokenFilePath, JSON.stringify(Token.cache));
  }

  private loadToken() {
    const tokenFilePath = `${TokenFolder}\\token.json`;
    if (!Utility.file.exists(tokenFilePath)) return null;

    try {
      const tokenData = Utility.file.readTextFile(tokenFilePath);
      return JSON.parse(tokenData) as TokenCache;
    } catch {
      return null;
    }
  }

  private isValidToken(tokenCache: TokenCache) {
    if (!tokenCache) return false;

    const now = new Date();
    const diff = now.getTime() - tokenCache.timestamp;
    return diff < MaxDurationMs && tokenCache.token;
  }

  private getCachedToken() {
    if (!Token.cache.token) {
      const tokenData = this.loadToken();
      if (tokenData) {
        Token.cache = tokenData;
      }
    }

    if (this.isValidToken(Token.cache)) {
      return Token.cache.token;
    }

    return null;
  }
}
