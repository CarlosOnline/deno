import EventEmitter from "https://deno.land/x/event_emitter/mod.ts";
import { logger } from "./utility/index.ts";

class NewClass extends EventEmitter {
  public constructor() {
    super();
  }

  public createEvent(): NewClass {
    this.emit("event", "The createEvent() method was called");
    return this; // Chainable
  }
}

const instance: NewClass = new NewClass();
instance.on("event", (message: string): void => {
  logger.info(`Message received: ${message}`);
});
instance.createEvent();
// Message received: The createEvent() method was called
