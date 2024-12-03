import * as Array from "fp-ts/Array";
import { Dictionary } from "lodash";
import { groupBy } from "lodash/fp";
import { Moment } from "moment";
import { STask } from "obsidian-dataview";
import { TasksContainer } from "src/tasks-container";
import * as TC from "src/tasks-container";
import { UnscheduledTask } from "src/types";
import { derived, Readable } from "svelte/store";

import { settings } from "../../global-store/settings";
import { getScheduledDay } from "../../util/dataview";
import { mapToTasksForDay } from "../../util/get-tasks-for-day";
import { getDayKey } from "../../util/tasks-utils";

export function useVisibleDataviewTasks(
  dataviewTasks: Readable<STask[]>,
  visibleDays: Readable<Moment[]>,
): Readable<TasksContainer> {
  return derived(
    [visibleDays, dataviewTasks, settings],
    ([$visibleDays, $dataviewTasks, $settings]) => {
      const dayToSTasks: Dictionary<STask[]> = groupBy(
        getScheduledDay,
        $dataviewTasks,
      );

      const allVisibleTasks: UnscheduledTask[] = Array.flatMap(
        $visibleDays,
        (day) => {
          const key = getDayKey(day);
          const sTasksForDay = dayToSTasks[key];

          if (sTasksForDay) {
            const tasks = mapToTasksForDay(day, sTasksForDay, $settings);
            return [...tasks.noTime, ...tasks.withTime];
          } else {
            return [];
          }
        },
      );

      return TC.fromArray(allVisibleTasks);
    },
  );
}
