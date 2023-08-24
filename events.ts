import EventEmitter from "https://deno.land/x/event_emitter/mod.ts";

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
  console.log(`Message received: ${message}`);
});
instance.createEvent();
// Message received: The createEvent() method was called
