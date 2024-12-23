import { partition } from "lodash/fp";
import { Moment } from "moment/moment";
import { STask } from "obsidian-dataview";

import { timeFromStartRegExp } from "../regexp";
import { DayPlannerSettings } from "../settings";
import { Task, UnscheduledTask } from "../types";

import { toTask, toUnscheduledTask } from "./dataview";

function isTimeSetOnTask(task: STask) {
  return timeFromStartRegExp.test(task.text);
}

type DurationOptions = Pick<
  DayPlannerSettings,
  "defaultDurationMinutes" | "extendDurationUntilNext"
>;

function calculateDuration(tasks: Task[], options: DurationOptions) {
  return tasks.map((current, i, array) => {
    if (current.durationMinutes) {
      return current;
    }

    const next = array[i + 1];
    const shouldExtendUntilNext = next && options.extendDurationUntilNext;

    if (shouldExtendUntilNext) {
      const minutesUntilNext = next.startMinutes - current.startMinutes;

      return {
        ...current,
        durationMinutes: minutesUntilNext,
      };
    }

    return {
      ...current,
      durationMinutes: options.defaultDurationMinutes,
    };
  });
}

export function mapToTasksForDay( //TODO: rename
  day: Moment,
  tasksForDay: STask[],
  settings: DayPlannerSettings,
) {
  const [withTime, withoutTime] = partition(isTimeSetOnTask, tasksForDay);

  interface ReduceAccType {
    parsed: STask[];
    errors: Error[];
  }

  const { parsed: tasksWithTime, errors } = withTime.reduce<ReduceAccType>(
    (result, sTask) => {
      // todo: remove once proper handling is in place
      try {
        const task = toTask(sTask, day);

        result.parsed.push(task);
      } catch (error) {
        result.errors.push(error);
      }

      return result;
    },
    { parsed: [], errors: [] },
  );

  tasksWithTime.sort((a, b) => a.startMinutes - b.startMinutes); //TODO: remove this

  const noTime: UnscheduledTask[] = withoutTime
    // todo: move out
    .filter((sTask) => {
      if (!sTask.task) {
        return false;
      }

      if (settings.showUnscheduledNestedTasks) {
        return true;
      }

      return !sTask.parent;
    })
    .map((sTask: STask) => toUnscheduledTask(sTask, day));

  const withTimeAndDuration: Task[] = calculateDuration(
    tasksWithTime,
    settings,
  );

  return { withTime: withTimeAndDuration, noTime, errors };
}
