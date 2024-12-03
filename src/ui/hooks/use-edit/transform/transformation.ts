import { Task } from "../../../../types";
import { SimpleEditOperation } from "../simple-edit-operation";
import { EditOperation } from "../types";
import { TimeCursor } from "../use-time-cursor";

export abstract class Transformation {
  abstract transform(
    baseline: Task[],
    editOperation: EditOperation,
    cursorTime: TimeCursor,
  ): SimpleEditOperation[];
}
