import type { Task } from "../../../../types";
import { SimpleEditOperation } from "../simple-edit-operation";
import { EditOperation } from "../types";
import { TimeCursor } from "../use-time-cursor";

import { Transformation } from "./transformation";

export class Create extends Transformation {
  transform(
    baseline: Task[],
    editOperation: EditOperation,
    cursorTime: TimeCursor,
  ): SimpleEditOperation[] {
    // return baseline.map((task) => {
    //   if (task.id === editTarget.id) {
    //     return {
    //       ...editTarget,
    //       durationMinutes: cursorTime - editTarget.startMinutes,
    //     };
    //   }

    //   return task;
    // });

    return []; //TODO:  implement
  }
}
