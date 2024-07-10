import { PlacedTask } from "../../../../types";

export abstract class Transformation {
  abstract transform(
    baseline: PlacedTask[],
    editTarget: PlacedTask,
    cursorTime: number,
  ): PlacedTask[];
}
