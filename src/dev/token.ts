// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import { loadEnvironmentFile } from "../options/options.ts";
import { logger } from "../utility/index.ts";
import Options from "../options/options.ts";
import { TokenCache } from "./index.ts";

export type ServiceToken = {
  [key: string]: any;
  service: string;
  env: string;
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
      const cachedToken = this.getCachedToken(tokenData.service, tokenData.env);
      if (cachedToken) {
        return cachedToken;
      }
    }

    if (Options.verbose) {
      console.log(tokenData);
    }

    const formBody: string[] = [];
    (<string[][]>(tokenData.body as any)).forEach((pair) => {
      const key = pair[0];
      const value = pair[1];
      if (!key || !value) {
        return;
      }
      const encodedKey = encodeURIComponent(key);
      const encodedValue = encodeURIComponent(value);
      formBody.push(encodedKey + "=" + encodedValue);
    });

    if (Options.verbose) {
      console.log(formBody);
    }

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

    const tokenCache = new TokenCache();
    tokenCache.saveToken(tokenData.service, tokenData.env, token);

    return token;
  }

  private getTokenData(service: string, env: string = "") {
    const serviceTokenMap = this.getServiceTokenMap();
    service = service || Object.keys(serviceTokenMap)[0];

    const serviceEnvMap = serviceTokenMap[service];
    if (!serviceEnvMap || Object.keys(serviceEnvMap).length == 0) {
      logger.fatal(
        `Missing service data for ${service} ${env} available services: ${Object.keys(
          serviceTokenMap
        )}`
      );
      return null;
    }

    const serviceEnvs = Object.keys(serviceEnvMap);
    env = env || serviceEnvs[0];

    if (Options.verbose) {
      console.log(`get token data for ${service} ${env}`, serviceEnvMap[env]);
    }

    const result = serviceEnvMap[env];
    if (!result) {
      logger.fatal(
        `Missing service data for ${service} ${env} available env: ${Object.keys(
          serviceEnvMap
        )}`
      );
      return null;
    }

    result["service"] = service;
    result["env"] = env;
    return result;
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

  private getCachedToken(service: string, env: string) {
    const tokenCache = new TokenCache();
    return tokenCache.getCachedToken(service, env);
  }
}
