import moment from "moment";

export class Moment {
  static addDays(value: Date, days: number): Date {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
  }

  static addTime(value: Date, time: number): Date {
    return moment(value).add(time, "minutes").toDate();
  }

  static getDate(day: Date | string, time: string) {
    const date = moment(day);
    const dateString = Moment.toDateString(date);
    return new Date(`${dateString}T${time}`);
  }

  static toDate(date: Date | moment.Moment) {
    return moment(date).startOf("day");
  }

  static toDateString(date: Date | moment.Moment) {
    return Moment.toDate(date).format("YYYY-MM-DD");
  }

  static toTimeString(date: Date | moment.Moment) {
    return moment(date).format("HH:mm");
  }

  static duration(start: Date, end: Date) {
    return moment.duration(moment(end).diff(start));
  }

  static durationHours(start: Date, end: Date) {
    return Moment.duration(start, end).asHours();
  }

  static durationMinutes(start: Date, end: Date) {
    return Moment.duration(start, end).asMinutes();
  }

  static isBetween(value: Date, start: Date, end: Date) {
    return moment(value).isBetween(start, end);
  }
}
