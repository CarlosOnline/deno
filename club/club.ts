import Utility from "../utility/utility.ts";

import { logger } from "../utility/index.ts";
import { Moment } from "../support/index.ts";

const TokenFile = "c:\\temp\\pro.token.json";

type TokenData = {
  clid: string;
  token: string;
  created: Date;
};

type Interval = {
  start_tm: string;
  end_tm: string;
  is_available: boolean;
  slots_available: number;
  sessions_available: number;
  label: string;
  pattern_minutes: number;
  pattern_start_tm: string;
};

type Column = {
  column_type: string;
  column_id: number;
  column_name: string;
  intervals: Interval[];
};

type DateData = {
  columns: Column[];
};

type DateValue = {
  [dates: string]: DateData;
};

type Schedule = {
  dates: DateValue;
};

type Availability = {
  duration: number;
  start: Date;
  end: Date;
  startString?: string;
  endString?: string;
};

type CourtAvailability = {
  name: string;
  day: string;
  date: Date;
  availability: Availability[];
};

export class Club {
  async getFreeTimes(date: Date) {
    const tokenData = await this.getToken();
    if (!tokenData) return;

    const schedule = await this.getFreeTimesResponse(date, tokenData);
    if (!schedule?.dates) return;

    const results = Object.keys(schedule.dates).map((key) => {
      const dateValue = schedule.dates[key];

      const date = new Date(key);
      const day = date.toJSON().split("T")[0];

      return dateValue.columns.map((column) => {
        return this.toCourtAvailability(column, day, date);
      });
    });

    return results;
  }

  private toCourtAvailability(column: Column, day: string, date: Date) {
    const minTime = Moment.getDate(day, "07:59");
    const maxTime = Moment.getDate(day, "21:01");

    const availability = column.intervals
      .filter((item) => item.is_available && item.sessions_available > 0)
      .map((interval) => {
        return this.toAvailability(day, interval);
      })
      .flatMap((item) => this.normalizeAvailability(item))
      .filter(
        (item) =>
          item.duration > 0.5 && Moment.isBetween(item.start, minTime, maxTime)
      );

    return <CourtAvailability>{
      name: column.column_name,
      day: day,
      date: date,
      availability: availability,
    };
  }

  private toAvailability(day: string, interval: Interval) {
    const start = Moment.getDate(day, interval.start_tm);
    const end = Moment.getDate(day, interval.end_tm);

    const duration = Moment.durationMinutes(start, end);

    return <Availability>{
      startString: start.toLocaleTimeString(),
      endString: end.toLocaleTimeString(),
      duration: duration,
      start: start,
      end: end,
    };
  }

  private normalizeAvailability(availability: Availability) {
    const results: Availability[] = [];
    let time = availability.start;

    // check day of week

    while (time < availability.end) {
      const remaining = Moment.durationMinutes(time, availability.end);
      const availableDuration = Math.min(60, remaining);
      const start = time;
      const end = Moment.addTime(time, availableDuration);
      time = end;

      const duration = Moment.durationMinutes(start, end);

      const portion: Availability = {
        startString: start.toLocaleTimeString(),
        endString: end.toLocaleTimeString(),
        duration: duration,
        start: start,
        end: end,
      };

      results.push(portion);
    }

    return results;
  }

  private async getFreeTimesResponse(date: Date, tokenData: TokenData) {
    const dateStr = Moment.toDateString(date);
    console.log("fetch", dateStr);
    const url = `https://fitvue.proclub.com/olb-api/?meth=store-schedule&store_id=120&from_date=${dateStr}&clid=${tokenData.clid}&token=${tokenData.token}`;

    const resp = await fetch(url, {
      method: "GET",
    });

    if (!resp.ok) {
      logger.error(
        `Fetch token failed ${resp.status} ${resp.statusText} for ${url}`
      );
      return null;
    }

    const body = await resp.json();
    return body as Schedule;
  }

  private getCachedToken() {
    const cached = Utility.file.readFileSafe(TokenFile);
    if (!cached) return null;

    const data = JSON.parse(cached);
    if (!data.created || !data.token || !data.clid) return null;

    const today = new Date(new Date().toDateString());
    const createdDate = new Date(data.created);
    const createdDay = new Date(createdDate.toDateString());

    if (createdDay.getTime() != today.getTime()) return null;

    return <TokenData>{
      token: data.token,
      clid: data.clid,
      created: data.created,
    };
  }

  private async getToken() {
    const cachedToken = this.getCachedToken();
    if (cachedToken) {
      return cachedToken;
    }

    const payload = {
      email: "CarlosOnline",
      pass: "MyPwd123;",
      authentication: "csi",
    };

    const url = "https://fitvue.proclub.com/olb-api/?meth=cl-login";
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      logger.error(`Fetch failed ${resp.status} ${resp.statusText} for ${url}`);
      return null;
    }

    const body = await resp.json();

    const clid = body.clid;
    const token = body.token;
    if (!clid || !token) {
      logger.error(
        `Fetch token failed ${resp.status} ${resp.statusText} for ${url}`
      );
      return null;
    }

    body.created = new Date();

    Utility.path.ensure_directory(Utility.path.dirname(TokenFile));
    Utility.file.writeFile(
      "c:\\temp\\pro.token.json",
      JSON.stringify(body, null, 3)
    );

    return <TokenData>{
      token,
      clid,
      created: new Date(),
    };
  }
}
