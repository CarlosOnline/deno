import Options from "../support/options.ts";

export interface DeployInfo {
  project: string;
  service: string;
  env: string;
  server: string;
}

export class DeployInfo {
  static getDeploymentInfo(value: string) {
    const deployInfo = DeployInfo.parseNamespace(value);

    if (!deployInfo.server) {
      const config = DeployInfo.findOpenshiftConfig(deployInfo);

      //deployInfo.project = config.project;
      //deployInfo.service = DeployInfo.getServiceName(config.project);
      deployInfo.server = config.server;
    }

    // Override server if specified
    // --server=alpha beta or prod
    if (Options.server) {
      const server = Options.openshiftServers[Options.server];
      if (server) {
        deployInfo.server = server;
      }
    }

    return deployInfo;
  }

  private static getServiceName(project: string) {
    const parts = project.split("-");
    return parts.slice(1, parts.length - 1).join("-");
  }

  private static parseNamespace(value: string) {
    const parts = value.split("-");
    const env = parts[parts.length - 1];
    let namePrefix = "";

    if (parts.length > 1) {
      namePrefix = parts.slice(0, parts.length - 1).join("-");
    }

    if (namePrefix) {
      if (!namePrefix.startsWith("rca-")) {
        namePrefix = `rca-${namePrefix}`;
      }
    }

    if (!namePrefix) {
      namePrefix = `rca-ce`;
    }

    const project = Options.project || namePrefix + "-" + env;

    return {
      project: project,
      service: DeployInfo.getServiceName(project),
      env: env,
      server: Options.server || "",
    } as DeployInfo;
  }

  private static findOpenshiftConfig(namespace: DeployInfo) {
    if (namespace.project) {
      if (Options.openshift[namespace.project]) {
        return Options.openshift[namespace.project];
      }
    }

    if (namespace.service) {
      if (Options.openshift[namespace.service]) {
        return Options.openshift[namespace.service];
      }
    }

    if (namespace.env) {
      if (Options.openshift[namespace.env]) {
        return Options.openshift[namespace.env];
      }
    }

    throw new Error(
      `Failed to find openshift config for ${namespace.project} - ${namespace.service} - ${namespace.env}`
    );
  }
}
