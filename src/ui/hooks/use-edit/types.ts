import type { Task } from "../../../types";

export enum EditMode {
  DRAG = "DRAG",
  DRAG_AND_SHIFT_OTHERS = "DRAG_AND_SHIFT_OTHERS",
  RESIZE = "RESIZE",
  RESIZE_AND_SHIFT_OTHERS = "RESIZE_AND_SHIFT_OTHERS",
  CREATE = "CREATE",
}

export interface EditOperation {
  task: Task;
  mode: EditMode;
  startCursorTimeDelta: number;
}
