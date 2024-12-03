import { Moment } from "moment/moment";
import { DEFAULT_DAILY_NOTE_FORMAT } from "obsidian-daily-notes-interface";

export function getDayKey(day: Moment) {
  return day.format(DEFAULT_DAILY_NOTE_FORMAT);
}
