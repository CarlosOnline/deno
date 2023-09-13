import { logger } from "../utility/index.ts";

// deno-lint-ignore-file no-explicit-any no-explicit-any
export interface Action {
  names: string[];
  description: string;
  examples: string[];
  target: any;
}

export const Actions: Action[] = [];

export function action(
  name: string,
  description = "",
  examples: string[] = []
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    Actions.push(<Action>{
      names: name.split(","),
      description: description,
      examples: examples,
      target: descriptor.value,
    });
  };
}

export class ActionRunner {
  public static async run(name: string) {
    const action = Actions.find((item) => {
      const idxName = item.names.indexOf(name);
      return idxName != -1;
    });

    if (!action) {
      logger.error(`Missing action ${name}`);
      ActionRunner.usage();
      return;
    }

    logger.info(`Running ${name}`);
    await action.target();
  }

  public static usage() {
    const maxNameLength =
      1 +
      Math.max.apply(
        Math,
        Actions.map((item) =>
          Math.max.apply(
            Math,
            item.names.map((name) => name.length)
          )
        )
      );

    const maxDescriptionLength =
      1 +
      Math.max.apply(
        Math,
        Actions.map((item) => item.description.length)
      );

    Actions.forEach((action) => {
      const names = action.names;
      names.forEach((name) => {
        logger.info(
          `${name.padEnd(maxNameLength)} ${action.description.padEnd(
            maxDescriptionLength
          )}`
        );
        if (action.examples.length) {
          action.examples.forEach((item) => logger.info(" ".padEnd(5) + item));
        }
      });
    });
  }
}
