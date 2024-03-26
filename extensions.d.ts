// deno-lint-ignore-file no-explicit-any
interface Array<T> {
  forEachParallel(func: (item: T) => Promise<void>): Promise<void>;
  forEachSequential(func: (item: T) => Promise<void>): Promise<void>;
}

interface Dict {
  [key: string]: string;
}
