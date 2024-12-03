import { getDateFromPath } from "obsidian-daily-notes-interface";
import { getId } from "src/util/id";
import { get, Readable, Writable } from "svelte/store";

import { snapMinutes } from "../../../global-store/derived-settings";
import { ObsidianFacade } from "../../../service/obsidian-facade";
import { DayPlannerSettings } from "../../../settings";
import { Task, UnscheduledTask } from "../../../types";
import { createTask } from "../../../util/task-utils";

import { EditMode, EditOperation } from "./types";
import { TimeCursor } from "./use-time-cursor";

export interface UseEditHandlersProps {
  startEdit: (operation: EditOperation) => void;
  confirmEdit: () => void;
  obsidianFacade: ObsidianFacade;
  editOperation: Writable<EditOperation>;
  settings: Readable<DayPlannerSettings>;
  timeCursor: Readable<TimeCursor>;
}

// todo: rename without `use`, there are no custom stores here
export function createEditHandlers({
  //TODO: replace with appropriate edit operation
  obsidianFacade,
  startEdit,
  confirmEdit,
  editOperation,
  settings,
  timeCursor,
}: UseEditHandlersProps) {
  function handleContainerDblClick() {
    const newTask = createTask(
      get(timeCursor).day,
      snapMinutes(get(timeCursor).minutes, get(settings)),
    );

    startEdit({
      task: { ...newTask, isGhost: true },
      mode: EditMode.CREATE,
      startCursorTimeDelta: 0,
    });
    confirmEdit();
  }

  function handleResizerMouseDown(task: Task) {
    const mode =
      get(settings).editMode === "push"
        ? EditMode.RESIZE_AND_SHIFT_OTHERS
        : EditMode.RESIZE;

    startEdit({
      task,
      mode,
      startCursorTimeDelta:
        get(timeCursor).minutes - (task.startMinutes + task.durationMinutes),
    });
  }

  async function handleTaskMouseUp(task: UnscheduledTask) {
    //TODO: remove?
    if (get(editOperation)) {
      return;
    }
  }

  async function handleTaskDblClick(task: UnscheduledTask) {
    const { path, line } = task.location;
    await obsidianFacade.revealLineInFile(path, line);
  }

  function startDragWithOptionalPush(task: Task) {
    const { editMode } = get(settings);
    if (editMode === "push") {
      startEdit({
        task,
        mode: EditMode.DRAG_AND_SHIFT_OTHERS,
        startCursorTimeDelta: get(timeCursor).minutes - task.startMinutes,
      });
    } else {
      startEdit({
        task,
        mode: EditMode.DRAG,
        startCursorTimeDelta: get(timeCursor).minutes - task.startMinutes,
      });
    }
  }

  function startCreateCopy(task: Task) {
    startEdit({
      task,
      mode: EditMode.COPY,
      startCursorTimeDelta: get(timeCursor).minutes - task.startMinutes,
      newId: getId(),
    });
  }

  function handleGripMouseDown(task: Task) {
    startDragWithOptionalPush(task);
  }

  function handleCopyMouseDown(task: Task) {
    startCreateCopy(task);
  }

  function handleUnscheduledTaskGripMouseDown(task: UnscheduledTask) {
    const withAddedTime = {
      ...task,
      startMinutes: snapMinutes(get(timeCursor).minutes, get(settings)),
      //TODO:  review this: location should be accessed as less as possible
      startTime: task.location
        ? getDateFromPath(task.location.path, "day") || window.moment()
        : window.moment(),
    };

    startEdit({
      //TODO:  fix this
      task: withAddedTime,
      mode: EditMode.DRAG,
      startCursorTimeDelta: 0,
    });
  }

  return {
    handleGripMouseDown,
    handleCopyMouseDown,
    handleContainerDblClick,
    handleResizerMouseDown,
    handleTaskMouseUp,
    handleTaskDblClick,
    handleUnscheduledTaskGripMouseDown,
  };
}
