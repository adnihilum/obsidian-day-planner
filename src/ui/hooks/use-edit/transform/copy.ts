import type { Task } from "../../../../types";
import { seoCopy, SimpleEditOperation } from "../simple-edit-operation";
import { EditOperation } from "../types";
import { TimeCursor } from "../use-time-cursor";

import { Transformation } from "./transformation";

export class Copy extends Transformation {
  transform(
    baseline: Task[],
    editOperation: EditOperation,
    cursorTime: TimeCursor,
  ): SimpleEditOperation[] {
    return [
      seoCopy(
        editOperation.task.id,
        editOperation.newId,
        cursorTime.day.clone().add(cursorTime.minutes, "minutes"),
      ),
    ];
  }
}
