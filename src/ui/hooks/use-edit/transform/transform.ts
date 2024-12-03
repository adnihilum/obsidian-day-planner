import * as M from "fp-ts/Map";
import * as O from "fp-ts/Option";
import * as Str from "fp-ts/string";
import { produce } from "immer";
import { TasksContainer } from "src/tasks-container";
import * as TC from "src/tasks-container";
import * as SU from "src/util/storage/storageUtils";
import { derived, Readable, Writable } from "svelte/store";
import { isNotVoid } from "typed-assert";

import { snapMinutes } from "../../../../global-store/derived-settings";
import { DayPlannerSettings } from "../../../../settings";
import type { Task, UnscheduledTask } from "../../../../types";
import { getDayKey } from "../../../../util/tasks-utils";
import { SimpleEditOperation } from "../simple-edit-operation";
import { TimelineKeeper } from "../timeline-keeper";
import { EditMode, EditOperation } from "../types";
import { TimeCursor, TimeCursorHistory } from "../use-time-cursor";

import { Copy } from "./copy";
import { Create } from "./create";
import { Drag } from "./drag";
import { DragAndShiftOthers } from "./drag-and-shift-others";
import { Resize } from "./resize";
import { ResizeAndShiftOthers } from "./resize-and-shift-others";
import { Transformation } from "./transformation";

const transformers: Record<EditMode, Transformation> = {
  [EditMode.DRAG]: new Drag(),
  [EditMode.DRAG_AND_SHIFT_OTHERS]: new DragAndShiftOthers(),
  [EditMode.CREATE]: new Create(),
  [EditMode.RESIZE]: new Resize(),
  [EditMode.RESIZE_AND_SHIFT_OTHERS]: new ResizeAndShiftOthers(),
  [EditMode.COPY]: new Copy(),
};

const multidayModes: Partial<EditMode[]> = [
  EditMode.DRAG,
  EditMode.DRAG_AND_SHIFT_OTHERS,
];

function isMultiday(mode: EditMode) {
  return multidayModes.includes(mode);
}

function getDestDay(operation: EditOperation, timeCursor: TimeCursor) {
  return isMultiday(operation.mode) ? timeCursor.day : operation.task.startTime;
}

function sortByStartMinutes(tasks: Task[]) {
  return produce(tasks, (draft) =>
    draft.sort((a, b) => a.startMinutes - b.startMinutes),
  );
}

export function transform(
  baseline: TasksContainer,
  adjustedTimeCursorHistory: TimeCursorHistory,
  operation: EditOperation,
): SimpleEditOperation[] {
  const destDay = getDestDay(operation, adjustedTimeCursorHistory.current);
  const destKey = getDayKey(destDay);

  const transformation = transformers[operation.mode];
  isNotVoid(transformation, `No transformer for operation: ${operation.mode}`);

  const destTasks = Array.from(
    TC.withTime(
      O.getOrElse(() => new Set<Task | UnscheduledTask>())(
        M.lookup(Str.Eq)(destKey)(baseline.byDate),
      ),
    ),
  ).filter((t) => !t.calendar);

  const withTimeSorted = sortByStartMinutes(destTasks);
  const simpleOperations = transformation.transform(
    withTimeSorted,
    operation,
    adjustedTimeCursorHistory.current,
  );

  return simpleOperations;
}

export function useTransformation(
  editOperation: Writable<EditOperation | undefined>,
  timeCursorHistory: Readable<TimeCursorHistory>,
  settings: Readable<DayPlannerSettings>,
  timelineKeeper: TimelineKeeper,
): void {
  const editOperationWithAdjustedCursorHistory = derived(
    [editOperation, timeCursorHistory, settings],
    ([$editOperation, $timeCursorHistory, $settings]) => {
      if (!$timeCursorHistory) return O.none;
      if (!$editOperation) return O.none;

      function adjustMinutes(cursorMinutes: number): number {
        return snapMinutes(
          cursorMinutes - $editOperation.startCursorTimeDelta,
          $settings,
        );
      }

      const adjustedTimeCursorHistory = {
        current: {
          ...$timeCursorHistory.current,
          minutes: adjustMinutes($timeCursorHistory.current.minutes),
        },
        previous: {
          ...$timeCursorHistory.previous,
          minutes: adjustMinutes($timeCursorHistory.previous.minutes),
        },
      };
      if (
        adjustedTimeCursorHistory.current &&
        adjustedTimeCursorHistory.previous &&
        adjustedTimeCursorHistory.current.day ===
          adjustedTimeCursorHistory.previous.day &&
        adjustedTimeCursorHistory.current.minutes ===
          adjustedTimeCursorHistory.previous.minutes // &&
      ) {
        return O.none;
      }

      return O.some<[EditOperation, TimeCursorHistory]>([
        $editOperation,
        adjustedTimeCursorHistory,
      ]);
    },
    O.none,
  );

  SU.filter<O.Option<[EditOperation, TimeCursorHistory]>>(
    (x) => O.isSome(x),
    O.none,
  )(editOperationWithAdjustedCursorHistory).subscribe(
    O.map(([$editOperation, $adjustedTimeCursorHistory]) => {
      const $baselineTasks = timelineKeeper.tasksAfterPendingEditOperations;
      const simpleEditTasks = transform(
        $baselineTasks,
        $adjustedTimeCursorHistory,
        $editOperation,
      );
      timelineKeeper.applyEdit(simpleEditTasks);
    }),
  );
}
