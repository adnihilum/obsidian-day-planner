import type { Task } from "../../../../types";
import { Transformation } from "./transformation";

export class Create extends Transformation {
  transform(baseline: Task[], editTarget: Task, cursorTime: number): Task[] {
    return baseline.map((task) => {
      if (task.id === editTarget.id) {
        return {
          ...editTarget,
          durationMinutes: cursorTime - editTarget.startMinutes,
        };
      }

      return task;
    });
  }
}
