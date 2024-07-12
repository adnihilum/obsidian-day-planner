import { Task } from "../../../../types";

export abstract class Transformation {
  abstract transform(
    baseline: Task[],
    editTarget: Task,
    cursorTime: number,
  ): Task[];
}
