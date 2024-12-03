import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/lib/function";
import { last } from "lodash";

import type { Task } from "../../../../types";
import { getEndMinutes } from "../../../../util/task-utils";
import {
  seoMove,
  seoResize,
  SimpleEditOperation,
} from "../simple-edit-operation";
import { EditOperation } from "../types";
import { TimeCursor } from "../use-time-cursor";

import { Transformation } from "./transformation";

export class ResizeAndShiftOthers extends Transformation {
  transform(
    baseline: Task[],
    editOperation: EditOperation,
    cursorTime: TimeCursor,
  ): SimpleEditOperation[] {
    const editTarget = editOperation.task;
    const index = baseline.findIndex((task) => task.id === editTarget.id);
    const preceding = baseline.slice(0, index);
    const following = baseline.slice(index + 1);

    const durationMinutes = cursorTime.minutes - editTarget.startMinutes;

    const updated = {
      ...editTarget,
      durationMinutes,
    };

    const updatedFollowing = following.reduce((result, current) => {
      const previous = last(result) || updated;

      if (getEndMinutes(previous) > current.startMinutes) {
        return [
          ...result,
          {
            ...current,
            startMinutes: getEndMinutes(previous),
          },
        ];
      }

      return [...result, current];
    }, []);

    const resultTasks = [...preceding, updated, ...updatedFollowing];

    return pipe(
      resultTasks,
      A.zip(baseline),
      A.map(([newTask, oldTask]) => {
        if (oldTask.id == editTarget.id) {
          return [seoResize(editTarget.id, durationMinutes)];
        } else {
          if (newTask.startMinutes != oldTask.startMinutes) {
            const newTime = oldTask.startTime
              .clone()
              .add(newTask.startMinutes - oldTask.startMinutes, "minutes");
            return [seoMove(oldTask.id, newTime)];
          } else {
            return [];
          }
        }
      }),
      A.flatten,
    );
  }
}
