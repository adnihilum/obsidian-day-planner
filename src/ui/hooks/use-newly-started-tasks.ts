import * as Eq from "fp-ts/Eq";
import * as S from "fp-ts/Set";
import * as Str from "fp-ts/string";
import { Moment } from "moment";
import { TasksContainer } from "src/tasks-container";
import * as TC from "src/tasks-container";
import { derived, get, Readable } from "svelte/store";

import { DayPlannerSettings } from "../../settings";
import { Task } from "../../types";
import { getEndTime, getNotificationKey } from "../../util/task-utils";

interface UseNewlyStartedTasksProps {
  settings: Readable<DayPlannerSettings>;
  currentTime: Readable<Moment>;
  tasksForToday: Readable<TasksContainer>;
}

export function useNewlyStartedTasks(props: UseNewlyStartedTasksProps) {
  const { settings, currentTime, tasksForToday } = props;
  let previousTasksInProgress: Set<Task> = new Set();

  return derived([settings, currentTime], ([$settings, $currentTime]) => {
    if (!$settings.showTaskNotification) {
      return [];
    }

    const tasksInProgress = S.filter((task: Task) => {
      return (
        task.startTime.isBefore($currentTime) &&
        getEndTime(task).isAfter($currentTime)
      );
    })(TC.withTime(get(tasksForToday).allTasksSet()));

    const newlyStarted = S.difference(Eq.contramap(getNotificationKey)(Str.Eq))(
      tasksInProgress,
      previousTasksInProgress,
    );

    previousTasksInProgress = tasksInProgress;

    return newlyStarted;
  });
}
