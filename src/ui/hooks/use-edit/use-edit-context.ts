import { Moment } from "moment";
import { Readable, writable } from "svelte/store";

import { ObsidianFacade } from "../../../service/obsidian-facade";
import { DayPlannerSettings } from "../../../settings";
import { OnUpdateFn, TasksForDay } from "../../../types";

import { createEditHandlers } from "./create-edit-handlers";
import { useCursor } from "./cursor";
import { EditOperation } from "./types";
import { useCursorMinutes } from "./use-cursor-minutes";
import { useDisplayedTasks } from "./use-displayed-tasks";
import { useDisplayedTasksForDay } from "./use-displayed-tasks-for-day";
import { useEditActions } from "./use-edit-actions";
import { useTimeCursors } from "./use-time-cursor";

export interface UseEditContextProps {
  obsidianFacade: ObsidianFacade;
  onUpdate: OnUpdateFn;
  settings: Readable<DayPlannerSettings>;
  visibleTasks: Readable<Record<string, TasksForDay>>;
}

// todo: the name is misleading
export function useEditContext({
  obsidianFacade,
  onUpdate,
  settings,
  visibleTasks,
}: UseEditContextProps) {
  const editOperation = writable<EditOperation | undefined>();
  const cursor = useCursor(editOperation);
  const pointerOffsetY = writable(0);
  const cursorMinutes = useCursorMinutes(pointerOffsetY, settings);
  const day = writable<Moment>();
  const { timeCursor, timeCursorHistory } = useTimeCursors(day, cursorMinutes);

  // todo: change misleading name
  const baselineTasks = writable({}, (set) => {
    return visibleTasks.subscribe(set);
  });

  const displayedTasks = useDisplayedTasks({
    baselineTasks,
    editOperation,
    timeCursorHistory,
    settings,
  });

  const { startEdit, confirmEdit, cancelEdit } = useEditActions({
    editOperation,
    baselineTasks,
    displayedTasks,
    onUpdate,
  });

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
    getDisplayedTasks: (day: Moment) =>
      useDisplayedTasksForDay(displayedTasks, day),
    handleMouseEnter: (currentDay: Moment) => day.set(currentDay),
  };

  // todo: return stuff only once
  return {
    cursor,
    displayedTasks,
    confirmEdit,
    cancelEdit,
    editHandlers,
    editOperation,
  };
}
