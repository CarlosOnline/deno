// deno-lint-ignore-file no-explicit-any
export type EnvironmentPerf = {
  environment: string;
  token: string;
  sql: {
    [key: string]: string;
    server: string;
    database: string;
    username: string;
    password: string;
  };
  endpoints: {
    [key: string]: string | number | undefined;
    url: string;
    method: string;
    delay?: number;
    payload?: any | null;
  }[];
};

export type EnvironmentToken = {
  [key: string]: any;
  target: string;
  url: string;
  body: [string, string][];
  outputFilePath?: string;
};

export type EnvironmentSql = {
  [key: string]: string;
  server: string;
  database: string;
};

export type EnvironmentApp = {
  [key: string]: {
    [key: string]: string;
    url: string;
  };
};

export interface EnvironmentData {
  projects: {
    [key: string]: string;
  };
  sql: EnvironmentSql;
  token: EnvironmentToken;
  tokens: {
    [key: string]: EnvironmentToken;
  };
  apps: EnvironmentApp;
  perf: {
    [key: string]: EnvironmentPerf;
  };
}
