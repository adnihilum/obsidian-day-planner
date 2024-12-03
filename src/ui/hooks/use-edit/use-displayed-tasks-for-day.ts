import * as Eq from "fp-ts/Eq";
import { pipe } from "fp-ts/lib/function";
import * as M from "fp-ts/Map";
import * as Monoid from "fp-ts/Monoid";
import * as O from "fp-ts/Option";
import * as S from "fp-ts/Set";
import * as Str from "fp-ts/string";
import { flow, uniqBy } from "lodash/fp";
import { Moment } from "moment/moment";
import { TasksContainer } from "src/tasks-container";
import * as TC from "src/tasks-container";
import * as SU from "src/util/storage/storageUtils";
import { derived, get, Readable } from "svelte/store";

import { addHorizontalPlacing } from "../../../overlap/overlap";
import { getIdAgnosticRenderKey } from "../../../util/task-utils";
import { getDayKey } from "../../../util/tasks-utils";

export function useDisplayedTasksForDay(
  displayedTasks: Readable<TasksContainer>,
  day: Readable<Moment>,
): Readable<TasksContainer> {
  console.log(`useDisplayedTasksForDay:`);

  const selectedTasksRaw = derived(
    [displayedTasks, day],
    ([$displayedTasks, $day]) =>
      pipe(
        $displayedTasks.byDate,
        M.lookup(Str.Eq)(getDayKey($day)),
        O.getOrElse(() => new Set()),
      ),
  );

  const selectedTasksRawUnique = SU.removeDups<Set<TC.UTask>>(
    S.getEq(
      Monoid.concatAll(Eq.getMonoid())([
        TC.eqUTaskByContent,
        TC.eqUTaskById,
        TC.eqTaskByLocation,
      ]),
    ),
  )(selectedTasksRaw, new Set());

  const selectedTasks = derived(
    [selectedTasksRawUnique],
    ([$selectedTasksRaw]) => {
      console.log(`useDisplayedTasksForDay derived: ${get(day)}`);

      const withTime = flow(
        uniqBy(getIdAgnosticRenderKey),
        addHorizontalPlacing,
      )(Array.from(TC.withTime($selectedTasksRaw)));

      const tasksForDay = TC.fromArray([
        ...withTime,
        ...TC.withNoTime($selectedTasksRaw),
      ]);

      return tasksForDay;
    },
  );

  return selectedTasks;
}
