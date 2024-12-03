import type { Task } from "../../../../types";
import { seoResize, SimpleEditOperation } from "../simple-edit-operation";
import { EditOperation } from "../types";
import { TimeCursor } from "../use-time-cursor";

import { Transformation } from "./transformation";

export class Resize extends Transformation {
  transform(
    baseline: Task[],
    editOperation: EditOperation,
    cursorTime: TimeCursor,
  ): SimpleEditOperation[] {
    const durationMinutes =
      cursorTime.minutes - editOperation.task.startMinutes;
    return [seoResize(editOperation.task.id, durationMinutes)];
  }
}
