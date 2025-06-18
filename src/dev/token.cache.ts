import Options from "../options/options.ts";
import { Utility } from "../utility/index.ts";

const OneSecondMs = 1000;
const OneMinuteMs = 60 * OneSecondMs;
const OneHourMs = 60 * OneMinuteMs;
const MaxDurationMs = OneHourMs;

const TokenFolder = "c:\\temp\\token";

export type TokenDataCached = {
  timestamp: number;
  date: Date;
  token: string;
};

export type TokenCacheMap = { [key: string]: TokenDataCached };

export class TokenCache {
  private static cache: TokenCacheMap = {};

  getCachedToken(service: string, env: string) {
    let tokenData = this.lookupToken(service, env);
    if (tokenData) {
      return tokenData.token;
    }

    tokenData = this.loadToken(service, env);
    if (!tokenData) return null;

    return tokenData.token;
  }

  saveToken(service: string, env: string, token: string) {
    const cachedToken = this.storeToken(service, env, token);

    Utility.path.ensure_directory(TokenFolder);

    const tokenFilePath = `${TokenFolder}\\${service}.${env}.token.json`;
    Utility.file.writeTextFile(tokenFilePath, JSON.stringify(cachedToken));
    console.log(`saved ${service} ${env} token to ${tokenFilePath}`);
  }

  private lookupToken(service: string, env: string) {
    const key = `${service}-${env}`;
    const cachedToken = TokenCache.cache[key];

    if (this.isValidToken(cachedToken)) {
      return cachedToken;
    }

    return null;
  }

  private storeToken(service: string, env: string, token: string) {
    const now = new Date();

    const key = `${service}-${env}`;

    const cachedToken = {
      timestamp: now.getTime(),
      date: now,
      token,
    };

    TokenCache.cache[key] = cachedToken;

    return cachedToken;
  }

  private isValidToken(tokenCache: TokenDataCached) {
    if (!tokenCache) return false;

    const now = new Date();
    const diff = now.getTime() - tokenCache.timestamp;
    return diff < MaxDurationMs && tokenCache.token;
  }

  private loadToken(service: string, env: string) {
    const tokenFilePath = `${TokenFolder}\\${service}.${env}.token.json`;
    if (!Utility.file.exists(tokenFilePath)) return null;

    try {
      const tokenDataRaw = Utility.file.readTextFile(tokenFilePath);
      const tokenData = JSON.parse(tokenDataRaw) as TokenDataCached;

      if (this.isValidToken(tokenData)) {
        this.storeToken(service, env, tokenData.token);

        if (Options.verbose) {
          console.log(`load token from ${tokenFilePath}`);
        }

        return tokenData;
      }
    } catch {
      // ignore
    }

    return null;
  }
}
