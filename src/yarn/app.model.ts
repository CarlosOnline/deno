export interface AppModel {
  appId: string;
  url: string;
  user: string;
  name: string;
  queue: string;
  status: string;
  finalStatus: string;
  startTime: Date;
  launchTime: Date | null;
  finishTime: Date | null;
  duration: number;
  durationString: string;
}
