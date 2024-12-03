import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/lib/function";
import { last } from "lodash";

import type { Task } from "../../../../types";
import { getEndMinutes } from "../../../../util/task-utils";
import { seoMove, SimpleEditOperation } from "../simple-edit-operation";
import { EditOperation } from "../types";
import { TimeCursor } from "../use-time-cursor";

import { Transformation } from "./transformation";

export class DragAndShiftOthers extends Transformation {
  transform(
    baseline: Task[],
    editOperation: EditOperation,
    cursorTime: TimeCursor,
  ): SimpleEditOperation[] {
    const editTarget = editOperation.task;
    const index = baseline.findIndex((task) => task.id === editTarget.id);
    const preceding = baseline.slice(0, index);
    const following = baseline.slice(index + 1);

    const updated = {
      ...editTarget,
      startMinutes: cursorTime.minutes,
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

    const updatedPreceding = preceding
      .reverse()
      .reduce((result, current) => {
        const nextInTimeline = last(result) || updated;

        if (nextInTimeline.startMinutes < getEndMinutes(current)) {
          return [
            ...result,
            {
              ...current,
              startMinutes:
                nextInTimeline.startMinutes - current.durationMinutes,
            },
          ];
        }

        return [...result, current];
      }, [])
      .reverse();

    const result: Task[] = [...updatedPreceding, updated, ...updatedFollowing];

    const simpleOperations = pipe(
      result,
      A.zip(baseline),
      A.map(([newTask, oldTask]) => {
        if (newTask.startMinutes != oldTask.startMinutes) {
          const newTime = oldTask.startTime
            .clone()
            .add(newTask.startMinutes - oldTask.startMinutes, "minutes");
          return [seoMove(oldTask.id, newTime)];
        } else {
          return [];
        }
      }),
      A.flatten,
    );

    return simpleOperations;
  }
}
