import type { PlacedTask } from "../../../../types";
import { Transformation } from "./transformation";

export class Create extends Transformation {
  transform(
    baseline: PlacedTask[],
    editTarget: PlacedTask,
    cursorTime: number,
  ): PlacedTask[] {
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
