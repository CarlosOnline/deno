// deno-lint-ignore-file no-explicit-any
import { TokenData } from "../support/options.ts";
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

export default class Token {
  private static cache: TokenCache = {
    timestamp: 0,
    date: new Date(),
    token: "",
  };

  async token(tokenData: TokenData, force = false) {
    if (!force) {
      const cachedToken = this.getCachedToken();
      if (cachedToken) {
        return cachedToken;
      }
    }

    const formBody: string[] = [];
    (<string[][]>(tokenData.body as any)).forEach((pair) => {
      const encodedKey = encodeURIComponent(pair[0]);
      const encodedValue = encodeURIComponent(pair[1]);
      formBody.push(encodedKey + "=" + encodedValue);
    });

    const formBodyJson = formBody.join("&");

    if (Options.verbose) {
      logger.info(`token ${tokenData.url}`, formBodyJson);
    }
    logger.info(`token ${tokenData.url}`, formBodyJson);

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
      return null;
    }

    const body = await resp.json();
    const token = body.access_token as string;

    this.saveToken(token);

    return token;
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
