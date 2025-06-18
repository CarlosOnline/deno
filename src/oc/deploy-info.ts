import Options from "../options/options.ts";

export interface DeployInfo {
  arg: string;
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
      const server = Options.openshift.servers[Options.server];
      if (server) {
        deployInfo.server = server;
      }
    }

    return deployInfo;
  }

  static parseNamespace(value: string): DeployInfo {
    const parts = value.split("-");
    const env = parts[parts.length - 1];
    let namePrefix = "";
    const ocPrefix = Options.openshift.projects.startsWith[0];

    if (parts.length > 1) {
      namePrefix = parts.slice(0, parts.length - 1).join("-");
    }

    if (namePrefix) {
      if (!namePrefix.startsWith(ocPrefix)) {
        namePrefix = `${ocPrefix}${namePrefix}`;
      }
    }

    if (!namePrefix) {
      namePrefix = `${ocPrefix}ce`;
    }

    const project = Options.project || namePrefix + "-" + env;

    return {
      arg: value,
      project: project,
      service: DeployInfo.getServiceName(project),
      env: env,
      server: Options.server || "",
    };
  }

  private static getServiceName(project: string) {
    const parts = project.split("-");
    return parts.slice(1, parts.length - 1).join("-");
  }

  private static findOpenshiftConfig(namespace: DeployInfo) {
    if (namespace.project) {
      if (Options.openshift.environments[namespace.project]) {
        return Options.openshift.environments[namespace.project];
      }
    }

    if (namespace.service) {
      if (Options.openshift.environments[namespace.service]) {
        return Options.openshift.environments[namespace.service];
      }
    }

    if (namespace.env) {
      if (Options.openshift.environments[namespace.env]) {
        return Options.openshift.environments[namespace.env];
      }
    }

    throw new Error(
      `Failed to find openshift config for ${namespace.project} - ${namespace.service} - ${namespace.env}`
    );
  }
}
