import { Moment } from "moment/moment";
import { getDateFromPath } from "obsidian-daily-notes-interface";
import { get, Readable, Writable } from "svelte/store";

import { ObsidianFacade } from "../../../service/obsidian-facade";
import { DayPlannerSettings } from "../../../settings";
import { PlacedTask, UnscheduledTask } from "../../../types";
import { copy, createTask } from "../../../util/task-utils";

import { EditMode, EditOperation } from "./types";

export interface UseEditHandlersProps {
  startEdit: (operation: EditOperation) => void;
  // todo: make dynamic, since it can change?
  day: Moment;
  obsidianFacade: ObsidianFacade;
  cursorMinutes: Readable<number>;
  editOperation: Writable<EditOperation>;
  settings: Readable<DayPlannerSettings>;
}

// todo: rename without `use`, there are no custom stores here
export function createEditHandlers({
  day,
  obsidianFacade,
  startEdit,
  cursorMinutes,
  editOperation,
  settings,
}: UseEditHandlersProps) {
  function handleContainerDblClick() {
    const newTask = createTask(day, get(cursorMinutes));

    startEdit({
      task: { ...newTask, isGhost: true },
      mode: EditMode.CREATE,
      day,
    });
  }

  function handleResizerMouseDown(task: PlacedTask) {
    const mode =
      get(settings).editMode === "push"
        ? EditMode.RESIZE_AND_SHIFT_OTHERS
        : EditMode.RESIZE;

    startEdit({ task, mode, day });
  }

  async function handleTaskMouseUp(task: UnscheduledTask) {
    if (get(editOperation)) {
      return;
    }
  }

  async function handleTaskDblClick(task: UnscheduledTask) {
    const { path, line } = task.location;
    await obsidianFacade.revealLineInFile(path, line);
  }

  function startDragWithOptionalPush(task: PlacedTask) {
    const { editMode } = get(settings);
    if (editMode === "push") {
      startEdit({
        task,
        mode: EditMode.DRAG_AND_SHIFT_OTHERS,
        day,
      });
    } else {
      startEdit({ task, mode: EditMode.DRAG, day });
    }
  }

  function handleGripMouseDown(task: PlacedTask) {
    // todo: edit mode in settings is different from the enum. The names should also be different
    const { copyOnDrag } = get(settings);
    const taskOrCopy = copyOnDrag ? copy(task) : task;

    startDragWithOptionalPush(taskOrCopy);
  }

  function handleCopyMouseDown(task: PlacedTask) {
    startDragWithOptionalPush(copy(task));
  }

  function handleUnscheduledTaskGripMouseDown(task: UnscheduledTask) {
    const withAddedTime = {
      ...task,
      startMinutes: get(cursorMinutes),
      // todo: add a proper fix
      startTime: task.location
        ? getDateFromPath(task.location.path, "day") || window.moment()
        : window.moment(),
    };

    startEdit({ task: withAddedTime, mode: EditMode.DRAG, day });
  }

  function handleMouseEnter() {
    editOperation.update(
      (previous) =>
        previous && {
          ...previous,
          day,
        },
    );
  }

  return {
    handleMouseEnter,
    handleGripMouseDown,
    handleCopyMouseDown,
    handleContainerDblClick,
    handleResizerMouseDown,
    handleTaskMouseUp,
    handleTaskDblClick,
    handleUnscheduledTaskGripMouseDown,
  };
}
