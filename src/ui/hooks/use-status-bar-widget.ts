import { sortBy } from "lodash/fp";
import { TasksContainer } from "src/tasks-container";
import * as TC from "src/tasks-container";
import { derived, Readable } from "svelte/store";

import { currentTime } from "../../global-store/current-time";
import { Task } from "../../types";
import { getDiffInMinutes } from "../../util/moment";
import { getEndTime } from "../../util/task-utils";

interface UseStatusBarWidgetProps {
  tasksForToday: Readable<TasksContainer>;
}

interface Widget {
  current?: {
    task: Task;
    timeLeft: string;
    percentageComplete: string;
  };
  next?: {
    task: Task;
    timeToNext: string;
  };
}

export function minutesToTimestamp(minutes: number) {
  return window.moment
    .utc(window.moment.duration(minutes, "minutes").asMilliseconds())
    .format("HH:mm");
}

export function useStatusBarWidget({ tasksForToday }: UseStatusBarWidgetProps) {
  return derived(
    [tasksForToday, currentTime],
    ([$tasksForToday, $currentTime]) => {
      const tasksForTodayWithTime = Array.from(
        TC.withTime(new Set($tasksForToday.allTasks.values())),
      );
      const currentItem = tasksForTodayWithTime.find(
        (item) =>
          item.startTime.isBefore($currentTime) &&
          getEndTime(item).isAfter($currentTime),
      );

      const nextItem = sortBy(
        (task) => task.startMinutes,
        tasksForTodayWithTime,
      ).find((task) => task.startTime.isAfter($currentTime));

      const widget: Widget = {};

      if (currentItem) {
        const minutesFromStart = getDiffInMinutes(
          currentItem.startTime,
          $currentTime,
        );
        const percentageComplete =
          minutesFromStart / (currentItem.durationMinutes / 100);
        const minutesLeft = getDiffInMinutes(
          getEndTime(currentItem),
          window.moment(),
        );
        const timeLeft = minutesToTimestamp(minutesLeft);

        widget.current = {
          percentageComplete: percentageComplete.toFixed(0),
          timeLeft,
          task: currentItem,
        };
      }

      if (nextItem) {
        const minutesToNext = getDiffInMinutes(
          $currentTime,
          nextItem.startTime,
        );
        const timeToNext = minutesToTimestamp(minutesToNext);

        widget.next = {
          timeToNext,
          task: nextItem,
        };
      }

      return widget;
    },
  );
}
