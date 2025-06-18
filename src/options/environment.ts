// deno-lint-ignore-file no-explicit-any ban-unused-ignore
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

export type EnvironmentOpenShift = {
  [key: string]: string;
  server: string;
  project: string;
};

export interface EnvironmentData {
  [index: string]: any;

  projects: {
    [key: string]: string;
  };
  sql: EnvironmentSql;
  apps: EnvironmentApp;
  perf: {
    [key: string]: EnvironmentPerf;
  };
  openshift: EnvironmentOpenShift;
}
