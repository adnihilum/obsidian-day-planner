import type { PlacedTask } from "../../../../types";
import { toSpliced } from "../../../../util/to-spliced";
import { Transformation } from "./transformation";

export class Drag extends Transformation {
  transform(
    baseline: PlacedTask[],
    editTarget: PlacedTask,
    cursorTime: number,
  ): PlacedTask[] {
    const index = baseline.findIndex((task) => task.id === editTarget.id);

    const startMinutes = cursorTime;

    const updated = {
      ...editTarget,
      startMinutes,
    };

    return toSpliced(baseline, index, updated);
  }
}
