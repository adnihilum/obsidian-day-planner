import * as F from "fp-ts/function";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as Rf from "fp-ts/Refinement";
import { Moment } from "moment";
import { settings } from "src/global-store/settings";
import { TasksContainer } from "src/tasks-container";
import * as TC from "src/tasks-container";
import { Task, UnscheduledTask } from "src/types";
import { getMinutesSinceMidnight } from "src/util/moment";
import { updateTaskScheduledDay } from "src/util/task-utils";
import { get } from "svelte/store";

import { TasksComparrison } from "./tasks-comparrison";

export interface SimpleEditOperation {
  apply(tasks: TasksContainer): TasksContainer;
  cleanupComparrison(tasksComp: TasksComparrison): TasksComparrison; //TODO:  remove
}

function underRef<A, B extends A>(
  ref: Rf.Refinement<A, B>,
  fn: (b: B) => B,
): (a: A) => A {
  return (a: A) => {
    if (ref(a)) return fn(a);
    else return a;
  };
}

function fixDuration(task: Task): Task {
  const endDateTime = task.startTime
    .clone()
    .add(task.durationMinutes, "minutes");
  const endDate = endDateTime.clone().startOf("day");
  if (!task.day.isSame(endDate) && !endDate.isSame(endDateTime)) {
    return { ...task, durationMinutes: get(settings).defaultDurationMinutes };
  } else {
    return task;
  }
}

function moveTask(newTime: Moment): (task: Task) => Task {
  return (task: Task) => ({
    ...task,
    startTime: newTime.clone(),
    startMinutes: getMinutesSinceMidnight(newTime.clone()),
    day: newTime.clone().startOf("day"),
  });
}

function setTaskId<T extends UnscheduledTask>(id: string): (task: T) => T {
  return (task: T) => ({ ...task, id });
}

function setTaskDuration(durationMinutes: number): (task: Task) => Task {
  return (task: Task) => ({ ...task, durationMinutes });
}

export function seoMove(taskId: string, newTime: Moment): SimpleEditOperation {
  function apply(tasks: TasksContainer): TasksContainer {
    return pipe(
      tasks.getTaskById(taskId),
      O.map(
        F.flow(
          underRef(
            TC.taskRef,
            F.flow(moveTask(newTime), fixDuration, updateTaskScheduledDay),
          ),
          tasks.setTaskById,
        ),
      ),
      O.getOrElse(() => {
        throw new Error(`couldn't find task with id ${taskId}`);
        return {} as TasksContainer;
      }),
    );
  }

  return { apply, cleanupComparrison: F.identity };
}

export function seoResize(
  taskId: string,
  newMinutesDuration: number,
): SimpleEditOperation {
  function apply(tasks: TasksContainer): TasksContainer {
    return pipe(
      tasks.getTaskById(taskId),
      O.map(
        F.flow(
          underRef(
            TC.taskRef,
            F.flow(
              setTaskDuration(newMinutesDuration),
              fixDuration,
              updateTaskScheduledDay,
            ),
          ),
          tasks.setTaskById,
        ),
      ),

      O.getOrElse(() => {
        throw new Error(`couldn't find task with id ${taskId}`);
        return {} as TasksContainer;
      }),
    );
  }
  return { apply, cleanupComparrison: F.identity };
}

export function seoCopy(
  taskId: string,
  newTaskId: string,
  newTime: Moment,
): SimpleEditOperation {
  function apply(tasks: TasksContainer): TasksContainer {
    return pipe(
      tasks.getTaskById(taskId),
      O.map(
        F.flow(
          underRef(
            TC.taskRef,
            F.flow(
              moveTask(newTime),
              fixDuration,
              updateTaskScheduledDay,
              setTaskId(newTaskId),
            ),
          ),
          tasks.setTaskById,
        ),
      ),
      O.getOrElse(() => {
        throw new Error(`couldn't find task with id ${taskId}`);
        return {} as TasksContainer;
      }),
    );
  }

  return { apply, cleanupComparrison: F.identity };
}
