import { assertStrictEq } from "https://deno.land/std/testing/asserts.ts";

import { Utility } from "./utility.ts";

Deno.test("Utility.info", function (): void {
  Utility.info("Test message");
});

Deno.test("Utility.info", function (): void {
  Utility.error("Test error message");
});

Deno.test("Utility.path.exists", function (): void {
  assertStrictEq(true, Utility.path.exists("c:\\temp"));
});
