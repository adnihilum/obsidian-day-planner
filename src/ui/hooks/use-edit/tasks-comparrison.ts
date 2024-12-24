import * as A from "fp-ts/Array";
import * as S from "fp-ts/Set";
import * as Ord from "fp-ts/Ord";

import { TasksContainer, UTask } from "src/tasks-container";
import * as TC from "src/tasks-container";

export interface TasksComparrison {
  newTasksRem: UTask[];
  oldTasksRem: UTask[];
  bindTasksPair: [UTask, UTask][];
}

export function compareTasks(
  newTasks: TasksContainer,
  oldTasks: TasksContainer,
  ordPriority: Ord.Ord<TC.UTask>,
): TasksComparrison {
  const ord = Ord.getSemigroup<UTask>().concat(
    ordPriority,
    TC.ordUTaskByContent,
  );
  const newTasksA = S.toArray(ord)(newTasks.allTasksSet());
  const oldTasksA = S.toArray(ord)(oldTasks.allTasksSet());

  let newTasksRem: TC.UTask[] = [];
  let oldTasksRem: TC.UTask[] = [];
  const bindTasksPair: [TC.UTask, TC.UTask][] = [];

  let i = 0;
  let j = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (i >= newTasksA.length) {
      oldTasksRem = oldTasksRem.concat(A.dropLeft(j)(oldTasksA));
      break;
    } else if (j >= oldTasksA.length) {
      newTasksRem = newTasksRem.concat(A.dropLeft(i)(newTasksA));
      break;
    }

    const newTask = newTasksA[i];
    const oldTask = oldTasksA[j];

    if (ordPriority.equals(newTask, oldTask)) {
      bindTasksPair.push([newTask, oldTask]);
      i++;
      j++;
    } else {
      const ordering = ord.compare(newTask, oldTask);
      if (ordering == 1) {
        oldTasksRem.push(oldTask);
        j++;
      } else {
        newTasksRem.push(newTask);
        i++;
      }
    }
  }

  return { newTasksRem, oldTasksRem, bindTasksPair };
}

export function tasksCompToString(tasksComp: TasksComparrison): string {
  const fields = [
    `newTasksRem.length = ${tasksComp.newTasksRem.length}`,
    `tasksComp.oldTasksRem.length = ${tasksComp.oldTasksRem.length}`,
    `testComp.bindTasksPair.length = ${tasksComp.bindTasksPair.length}`,
  ];

  return fields.join("; ");
}
