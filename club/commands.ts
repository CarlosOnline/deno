import { Moment, action } from "../support/index.ts";
import { Club } from "./club.ts";

export default class ClubCommands {
  @action("pro.free", "Get free spots")
  async getFreeTimes() {
    const club = new Club();
    const today = new Date();
    const date = Moment.addDays(today, 3);
    const results = await club.getFreeTimes(date);
    console.log(results);
  }
}
