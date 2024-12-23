import type { Task } from "../../../../types";
import { seoMove, SimpleEditOperation } from "../simple-edit-operation";
import { EditOperation } from "../types";
import { TimeCursor } from "../use-time-cursor";

import { Transformation } from "./transformation";

export class Drag extends Transformation {
  transform(
    baseline: Task[],
    editOperation: EditOperation,
    cursorTime: TimeCursor,
  ): SimpleEditOperation[] {
    return [
      seoMove(
        editOperation.task.id,
        cursorTime.day.clone().add(cursorTime.minutes, "minutes"),
      ),
    ];
  }
}
