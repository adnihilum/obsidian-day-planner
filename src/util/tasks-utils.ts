import { difference, differenceBy, mergeWith } from "lodash/fp";
import { Moment } from "moment/moment";
import {
  DEFAULT_DAILY_NOTE_FORMAT,
  getDateFromPath,
} from "obsidian-daily-notes-interface";

import { Diff, PlacedTask, Task, Tasks, TasksForDay } from "../types";

import {
  isEqualTask,
  updateTaskScheduledDay,
  updateTaskText,
} from "./task-utils";

export function getEmptyRecordsForDay(): TasksForDay {
  return { withTime: [], noTime: [] };
}

export function getTasksWithTime(tasks: Tasks) {
  return Object.values(tasks).flatMap(({ withTime }) => withTime);
}

export function getFlatTasksWithKeys(tasks: Tasks) {
  return Object.entries(tasks).flatMap(([dayKey, { withTime }]) => [
    ...withTime.map((x) => ({ dayKey, task: x })),
  ]);
}

export function removeTask(task: Task, tasks: TasksForDay) {
  return {
    ...tasks,
    noTime: tasks.noTime.filter((t) => t.id !== task.id),
    withTime: tasks.withTime.filter((t) => t.id !== task.id),
  };
}

export function addTaskWithTime(task: Task, tasks: TasksForDay) {
  return {
    ...tasks,
    withTime: [...tasks.withTime, task],
  };
}

export function moveToTimed(task: Task, tasks: TasksForDay) {
  const withRemoved = removeTask(task, tasks);
  return { ...withRemoved, withTime: [...withRemoved.withTime, task] };
}

export function getDayKey(day: Moment) {
  return day.format(DEFAULT_DAILY_NOTE_FORMAT);
}

//moves task between columns and changes its source text
export function moveTaskToDay(baseline: Tasks, task: Task, day: Moment) {
  const sourceKey = getDayKey(task.startTime);
  const destKey = getDayKey(day);
  const source = baseline[sourceKey];
  const dest = baseline[destKey];

  return {
    ...baseline,
    [sourceKey]: removeTask(task, source),
    [destKey]: addTaskWithTime(task, dest),
  };
}

export function moveTaskToColumn(day: Moment, task: Task, baseline: Tasks) {
  if (day.isSame(task.startTime, "day")) {
    const key = getDayKey(task.startTime);

    return {
      ...baseline,
      [key]: moveToTimed(task, baseline[key]),
    };
  }

  return moveTaskToDay(baseline, task, day);
}

// todo: don't get tasks in daily notes here
export function getTasksWithUpdatedDay(tasks: Tasks) {
  return Object.entries(tasks)
    .flatMap(([dayKey, tasks]) =>
      tasks.withTime.map((task) => ({ dayKey, task })),
    )
    .filter(({ dayKey, task }) => {
      const dateFromPath = task.location?.path
        ? getDateFromPath(task.location?.path, "day")
        : null;

      return (
        !task.isGhost && dayKey !== getDayKey(task.startTime) && !dateFromPath
      );
    });
}

// TODO: remove duplication
export function getTasksInDailyNotesWithUpdatedDay(tasks: Tasks) {
  return Object.entries(tasks)
    .flatMap(([dayKey, tasks]) =>
      tasks.withTime.map((task) => ({ dayKey, task })),
    )
    .filter(({ dayKey, task }) => {
      // TODO: remove this. It creates a dep on another plugin
      const dateFromPath = task.location?.path
        ? getDateFromPath(task.location?.path, "day")
        : null;

      return (
        !task.isGhost && dayKey !== getDayKey(task.startTime) && dateFromPath
      );
    });
}

function getPristine(flatBaseline: PlacedTask[], flatNext: PlacedTask[]) {
  return flatNext.filter((task) =>
    flatBaseline.find((baselineTask) => isEqualTask(task, baselineTask)),
  );
}

function getCreatedTasks(
  base: { dayKey: string; task: Task }[],
  next: { dayKey: string; task: Task }[],
) {
  return differenceBy((x) => x.task.id, next, base);
}

function getTasksWithUpdatedTime(base: PlacedTask[], next: PlacedTask[]) {
  const pristine = getPristine(base, next);

  return difference(next, pristine).filter((task) => !task.isGhost);
}

export function getDiff(base: Tasks, next: Tasks) {
  return {
    updatedTime: getTasksWithUpdatedTime(
      getTasksWithTime(base),
      getTasksWithTime(next),
    ),
    updatedDay: getTasksWithUpdatedDay(next),
    moved: getTasksInDailyNotesWithUpdatedDay(next),
    created: getCreatedTasks(
      getFlatTasksWithKeys(base),
      getFlatTasksWithKeys(next),
    ),
  };
}

// todo: this syncs task state with text, it should be derived
export function updateText(diff: Diff) {
  return {
    created: diff.created.map((x) => ({
      ...x,
      task: updateTaskText(updateTaskScheduledDay(x.task, x.dayKey)),
    })),
    updated: [
      ...diff.updatedTime.map(updateTaskText),
      ...diff.updatedDay.map(({ dayKey, task }) =>
        updateTaskText(updateTaskScheduledDay(task, dayKey)),
      ),
    ],
  };
}

export const mergeTasks = mergeWith((value, sourceValue) => {
  return Array.isArray(value) ? value.concat(sourceValue) : undefined;
});
