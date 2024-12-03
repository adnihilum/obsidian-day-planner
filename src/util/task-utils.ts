import { isEmpty } from "lodash/fp";
import type { Moment } from "moment";
import { get } from "svelte/store";

import { defaultDurationMinutes } from "../constants";
import { settings } from "../global-store/settings";
import {
  keylessScheduledPropRegExp,
  scheduledPropRegExp,
  shortScheduledPropRegExp,
} from "../regexp";
import { Task } from "../types";

import { getId } from "./id";
import { addMinutes, minutesToMoment, minutesToMomentOfDay } from "./moment";
import { getDayKey } from "./tasks-utils";

export function isEqualTask(a: Task, b: Task) {
  return (
    a.id === b.id &&
    a.startMinutes === b.startMinutes &&
    a.durationMinutes === b.durationMinutes
  );
}

export function getEndMinutes(task: {
  startMinutes: number;
  durationMinutes: number;
}) {
  return task.startMinutes + task.durationMinutes;
}

export function getEndTime(task: {
  startTime: Moment;
  durationMinutes: number;
}) {
  return task.startTime.clone().add(task.durationMinutes, "minutes");
}

export function getRenderKey(task: Task) {
  return task.id;
}

export function getIdAgnosticRenderKey(task: Task) {
  return `${task.startMinutes} ${getEndMinutes(task)} ${task.displayedText} ${task.isGhost ?? ""}`;
}

export function getNotificationKey(task: Task): string {
  return `${task.location?.path ?? "blank"}::${task.startMinutes}::${
    task.durationMinutes
  }::${task.displayedText}`;
}

export function createTimestamp(
  startMinutes: number,
  durationMinutes: number,
  format: string,
) {
  const start = minutesToMoment(startMinutes);
  const end = addMinutes(start, durationMinutes);

  return `${start.format(format)} - ${end.format(format)}`;
}

export function areValuesEmpty(record: Record<string, [] | object>) {
  return Object.values(record).every(isEmpty);
}

function taskLineToString(task: Task): string {
  return `${task.listTokens}${createTimestamp(
    task.startMinutes,
    task.durationMinutes,
    get(settings).timestampFormat,
  )} ${task.firstLineText}`;
}

export function updateScheduledPropInText(
  text: string,
  dayKey: string,
): string {
  const updated = text
    .replace(shortScheduledPropRegExp, `$1${dayKey}`)
    .replace(scheduledPropRegExp, `$1${dayKey}$2`)
    .replace(keylessScheduledPropRegExp, `$1${dayKey}$2`);

  return updated;
}

export function updateTaskScheduledDay(task: Task): Task {
  return {
    ...task,
    firstLineText: updateScheduledPropInText(
      task.firstLineText,
      getDayKey(task.day),
    ),
  };
}

export function renderToMDFirstLine(task: Task): string {
  return taskLineToString(task);
}

export function offsetYToMinutes(
  offsetY: number,
  zoomLevel: number,
  startHour: number,
) {
  const hiddenHoursSize = startHour * 60 * zoomLevel;

  return (offsetY + hiddenHoursSize) / zoomLevel;
}

export function createTask(day: Moment, startMinutes: number): Task {
  return {
    id: getId(),
    day,
    startMinutes,
    durationMinutes: defaultDurationMinutes,
    firstLineText: "New item",
    displayedText: "New item",
    startTime: minutesToMomentOfDay(startMinutes, day),
    listTokens: "- [ ] ",
    placing: {
      widthPercent: 100,
      xOffsetPercent: 0,
    },
  };
}
