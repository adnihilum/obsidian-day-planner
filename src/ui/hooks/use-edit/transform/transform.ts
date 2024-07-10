import { produce } from "immer";
import { partition } from "lodash/fp";
import { isNotVoid } from "typed-assert";

import type { Task, Tasks } from "../../../../types";
import { getDayKey, moveTaskToColumn } from "../../../../util/tasks-utils";
import { EditMode, EditOperation } from "../types";

import { Create } from "./create";
import { Drag } from "./drag";
import { DragAndShiftOthers } from "./drag-and-shift-others";
import { Resize } from "./resize";
import { ResizeAndShiftOthers } from "./resize-and-shift-others";
import { DayPlannerSettings } from "../../../../settings";
import { snapMinutes } from "../../../../global-store/derived-settings";
import { Transformation } from "./transformation";
import { TimeCursor, TimeCursorHistory } from "../use-time-cursor";

const transformers: Record<EditMode, Transformation> = {
  [EditMode.DRAG]: new Drag(),
  [EditMode.DRAG_AND_SHIFT_OTHERS]: new DragAndShiftOthers(),
  [EditMode.CREATE]: new Create(),
  [EditMode.RESIZE]: new Resize(),
  [EditMode.RESIZE_AND_SHIFT_OTHERS]: new ResizeAndShiftOthers(),
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
  baseline: Tasks,
  timeCursorHistory: TimeCursorHistory,
  operation: EditOperation,
  settings: DayPlannerSettings,
) {
  function adjustMinutes(cursorMinutes: number): number {
    return snapMinutes(
      cursorMinutes - operation.startCursorTimeDelta,
      settings,
    );
  }

  const adjustedTimeCursorHistory = {
    current: {
      ...timeCursorHistory.current,
      minutes: adjustMinutes(timeCursorHistory.current.minutes),
    },
    previous: {
      ...timeCursorHistory.previous,
      minutes: adjustMinutes(timeCursorHistory.previous.minutes),
    },
  };

  const destDay = getDestDay(operation, timeCursorHistory.current);
  const destKey = getDayKey(destDay);

  const transformation = transformers[operation.mode];
  isNotVoid(transformation, `No transformer for operation: ${operation.mode}`);

  if (
    adjustedTimeCursorHistory.current &&
    adjustedTimeCursorHistory.previous &&
    adjustedTimeCursorHistory.current.day ===
      adjustedTimeCursorHistory.previous.day &&
    adjustedTimeCursorHistory.current.minutes ===
      adjustedTimeCursorHistory.previous.minutes
  ) {
    return;
  } else {
    const withTaskInRightColumn = moveTaskToColumn(
      destDay,
      operation.task,
      baseline,
    );

    const destTasks = withTaskInRightColumn[destKey];

    const [readonly, editable] = partition(
      (task) => task.calendar,
      destTasks.withTime,
    );
    const withTimeSorted = sortByStartMinutes(editable);
    const transformed = transformation.transform(
      withTimeSorted,
      operation.task,
      adjustedTimeCursorHistory.current.minutes,
    );
    const merged = [...readonly, ...transformed];

    return {
      ...withTaskInRightColumn,
      [destKey]: {
        ...destTasks,
        withTime: merged,
      },
    };
  }
}
