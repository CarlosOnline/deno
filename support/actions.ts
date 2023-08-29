import { logger } from "../utility/index.ts";

// deno-lint-ignore-file no-explicit-any
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
      console.error(`Missing action ${name}`);
      return;
    }

    logger.info(`Running ${name}`);
    await action.target();
  }
}
