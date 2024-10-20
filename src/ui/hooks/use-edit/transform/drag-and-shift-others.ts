import { last } from "lodash";

import type { Task } from "../../../../types";
import { getEndMinutes } from "../../../../util/task-utils";
import { Transformation } from "./transformation";

export class DragAndShiftOthers extends Transformation {
  transform(baseline: Task[], editTarget: Task, cursorTime: number): Task[] {
    const index = baseline.findIndex((task) => task.id === editTarget.id);
    const preceding = baseline.slice(0, index);
    const following = baseline.slice(index + 1);

    const updated = {
      ...editTarget,
      startMinutes: cursorTime,
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

    return [...updatedPreceding, updated, ...updatedFollowing];
  }
}
