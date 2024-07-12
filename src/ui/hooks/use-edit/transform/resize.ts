import type { Task } from "../../../../types";
import { toSpliced } from "../../../../util/to-spliced";
import { Transformation } from "./transformation";

export class Resize extends Transformation {
  transform(baseline: Task[], editTarget: Task, cursorTime: number): Task[] {
    const index = baseline.findIndex((task) => task.id === editTarget.id);
    const durationMinutes = cursorTime - editTarget.startMinutes;
    const updated = {
      ...editTarget,
      durationMinutes,
    };

    return toSpliced(baseline, index, updated);
  }
}
