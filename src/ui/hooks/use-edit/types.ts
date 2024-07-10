import type { PlacedTask } from "../../../types";

export enum EditMode {
  DRAG = "DRAG",
  DRAG_AND_SHIFT_OTHERS = "DRAG_AND_SHIFT_OTHERS",
  RESIZE = "RESIZE",
  RESIZE_AND_SHIFT_OTHERS = "RESIZE_AND_SHIFT_OTHERS",
  CREATE = "CREATE",
}

export interface EditOperation {
  task: PlacedTask;
  mode: EditMode;
  startCursorTimeDelta: number;
}
