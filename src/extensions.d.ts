// deno-lint-ignore-file no-explicit-any ban-unused-ignore
interface Array<T> {
  forEachParallel(func: (item: T) => Promise<void>): Promise<void>;
  forEachSequential(func: (item: T) => Promise<void>): Promise<void>;
}

interface Dict {
  [key: string]: any;
}

interface StringDict {
  [key: string]: string;
}
