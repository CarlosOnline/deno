// deno-lint-ignore-file no-explicit-any

import Options from "../support/options.ts";

import { action } from "../support/index.ts";
import { Perf } from "./perf.ts";

export default class PerfCommands {
  @action("perf.loop", "Perf loop")
  async prefLoop() {
    const service = new Perf();
    await service.loop(Options.interval || 5);
    console.log("completed");
  }
}
