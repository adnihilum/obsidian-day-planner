import { Moment } from "moment";
import { PlanEditor } from "src/service/plan-editor";
import { TasksContainer } from "src/tasks-container";
import * as TC from "src/tasks-container";
import * as SU from "src/util/storage/storageUtils";
import { Readable, writable } from "svelte/store";

import { ObsidianFacade } from "../../../service/obsidian-facade";
import { DayPlannerSettings } from "../../../settings";

import { createEditHandlers } from "./create-edit-handlers";
import { useCursor } from "./cursor";
import { TimelineKeeper } from "./timeline-keeper";
import { useTransformation } from "./transform/transform";
import { EditOperation } from "./types";
import { useCursorMinutes } from "./use-cursor-minutes";
import { useDisplayedTasksForDay } from "./use-displayed-tasks-for-day";
import { useEditActions } from "./use-edit-actions";
import { useTimeCursors } from "./use-time-cursor";

export interface UseEditContextProps {
  obsidianFacade: ObsidianFacade;
  settings: Readable<DayPlannerSettings>;
  visibleTasks: Readable<TasksContainer>;
  planEditor: PlanEditor;
}

export function useEditContext({
  obsidianFacade,
  settings,
  visibleTasks,
  planEditor,
}: UseEditContextProps) {
  const editOperation = writable<EditOperation | undefined>();
  const cursor = useCursor(editOperation);
  const pointerOffsetY = writable(0);
  const cursorMinutes = useCursorMinutes(pointerOffsetY, settings);
  const day = writable<Moment>();
  const { timeCursor, timeCursorHistory } = useTimeCursors(day, cursorMinutes);

  const timelineKeeper = new TimelineKeeper(planEditor);

  const unduppedVisibleTasks = SU.removeDups(TC.eqByContentAndLocation)(
    visibleTasks,
    new TasksContainer(),
  );

  unduppedVisibleTasks.subscribe((tc) =>
    timelineKeeper.changedTasksFromDisk(tc),
  );

  useTransformation(editOperation, timeCursorHistory, settings, timelineKeeper);

  const displayedTasks: Readable<TasksContainer> =
    timelineKeeper.displayedTasksStore;

  const { startEdit, confirmEdit, cancelEdit } = useEditActions(
    editOperation,
    timelineKeeper,
  );

  const editHandlersRaw = createEditHandlers({
    obsidianFacade,
    startEdit,
    confirmEdit,
    editOperation,
    settings,
    timeCursor,
  });

  const editHandlers = {
    ...editHandlersRaw,
    cursor,
    cancelEdit,
    pointerOffsetY,
    getDisplayedTasks: (day: Readable<Moment>) =>
      useDisplayedTasksForDay(displayedTasks, day),
    handleMouseEnter: (currentDay: Moment) => day.set(currentDay),
  };

  return {
    cursor,
    displayedTasks,
    confirmEdit,
    cancelEdit,
    editHandlers,
    editOperation,
  };
}
