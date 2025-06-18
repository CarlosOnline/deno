// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import { logger } from "../utility/index.ts";
import "reflect-metadata";

export const CommandTargets: any[] = [];

export function command(
  name: string,
  description = "",
  examples: string[] = []
): any {
  return function (
    target: any,
    _propertyKey: any,
    descriptor: PropertyDescriptor
  ) {
    CommandTargets.push(target);

    const names = name.split(",").map((item) => item.trim());
    Reflect.defineMetadata("names", names, target);
    Reflect.defineMetadata("examples", examples, target);
    Reflect.defineMetadata("description", description, target);

    return descriptor;
  };
}

export class CommandRunner {
  public static async run(name: string) {
    const command = CommandTargets.find((target) => {
      const names = Reflect.getMetadata("names", target);
      const idxName = names.indexOf(name);
      return idxName != -1;
    });

    if (!command) {
      logger.error(`Missing action ${name}`);
      CommandRunner.usage();
      return;
    }

    logger.info(`Running ${name}`);
    await command();
  }

  public static usage() {
    const maxNameLength = getMaxNamesLength();
    const maxDescriptionLength = getMaxDescriptionLength();

    CommandTargets.forEach((target) => {
      const names: string[] = Reflect.getMetadata("names", target);
      const description: string = Reflect.getMetadata("description", target);
      const examples: string[] = Reflect.getMetadata("examples", target);

      names.forEach((name) => {
        logger.info(
          `${name.padEnd(maxNameLength)} ${description.padEnd(
            maxDescriptionLength
          )}`
        );

        if (examples.length) {
          examples.forEach((item) => logger.info(" ".padEnd(5) + item));
        }
      });
    });

    function getMaxNamesLength() {
      return (
        1 +
        Math.max.apply(
          Math,
          CommandTargets.map((target) => {
            const names: string[] = Reflect.getMetadata("names", target);

            return Math.max.apply(
              Math,
              names.map((name) => name.length)
            );
          })
        )
      );
    }

    function getMaxDescriptionLength() {
      return (
        1 +
        Math.max.apply(
          Math,
          CommandTargets.map((target) => {
            const description: string = Reflect.getMetadata(
              "description",
              target
            );
            return description.length;
          })
        )
      );
    }
  }
}
