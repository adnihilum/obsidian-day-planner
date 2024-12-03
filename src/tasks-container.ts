import * as A from "fp-ts/Array";
import * as Eq from "fp-ts/Eq";
import { pipe } from "fp-ts/lib/function";
import * as Ref from "fp-ts/lib/Refinement";
import Magma from "fp-ts/Magma";
import * as M from "fp-ts/Map";
import * as Monoid from "fp-ts/Monoid";
import * as Number from "fp-ts/number";
import * as O from "fp-ts/Option";
import * as Ord from "fp-ts/Ord";
import * as S from "fp-ts/Set";
import * as String from "fp-ts/string";
import { Moment } from "moment";
import { Loc, Pos } from "obsidian";

import { Task, TaskLocation, UnscheduledTask } from "./types";
import { getDayKey } from "./util/tasks-utils";

export type UTask = Task | UnscheduledTask;

export class TasksContainer {
  byDate: Map<string, Set<UTask>>;

  allTasks: Map<string, UTask>;

  constructor(byDate?: Map<string, Set<UTask>>, allTasks?: Map<string, UTask>) {
    this.byDate = byDate ?? new Map();
    this.allTasks = allTasks ?? new Map();

    this.putMany = this.putMany.bind(this);
    this.union = this.union.bind(this);
    this.getTaskById = this.getTaskById.bind(this);
    this.setTaskById = this.setTaskById.bind(this);
    this.allTasksSet = this.allTasksSet.bind(this);
  }

  putMany(tasks: UTask[]): TasksContainer {
    console.log(`putMany: tasks length = ${tasks.length}`);

    const magmaSelectOne: Magma.Magma<UTask> = {
      concat(x: UTask, y: UTask): UTask {
        return x;
      },
    };

    function dummyEq<T>(): Eq.Eq<T> {
      //TODO:  strongly consider to use Eq<UTask> instance here
      return {
        equals: (x: T, y: T) => x == y,
      };
    }
    const nextAllTasks: Map<string, UTask> = M.union(
      String.Eq,
      magmaSelectOne,
    )(
      M.fromFoldable(
        String.Eq,
        magmaSelectOne,
        A.Foldable,
      )(A.map<UTask, [string, UTask]>((t) => [t.id, t])(tasks)),
    )(this.allTasks);

    const nextByDate: Map<string, Set<UTask>> = M.union(
      String.Eq,
      S.getUnionSemigroup(dummyEq<UTask>()),
    )(
      M.fromFoldable(
        String.Eq,
        S.getUnionSemigroup(dummyEq<UTask>()),
        A.Foldable,
      )(
        A.map<UTask, [string, Set<UTask>]>((t) => [
          getDayKey(t.day),
          new Set([t]),
        ])(tasks),
      ),
    )(this.byDate);

    return new TasksContainer(nextByDate, nextAllTasks);
  }

  union(that: TasksContainer): TasksContainer {
    return this.putMany(Array.from(that.allTasks.values()));
  }

  getTaskById(taskId: string): O.Option<UnscheduledTask | Task> {
    return M.lookup(String.Eq)(taskId)(this.allTasks);
  }

  setTaskById(task: UnscheduledTask | Task): TasksContainer {
    const newTasks: Map<string, UTask> = M.upsertAt(String.Eq)(task.id, task)(
      this.allTasks,
    );
    return fromArray(Array.from(newTasks.values()));
  }

  allTasksSet(): Set<UTask> {
    return new Set(this.allTasks.values());
  }
}

export const taskRef: Ref.Refinement<UnscheduledTask, Task> = (
  t: UnscheduledTask,
): t is Task => (t as Task).startTime !== undefined;

export function withTime(tasks: Set<UTask>): Set<Task> {
  return S.filter<UnscheduledTask, Task>(taskRef)(tasks);
}

export function withNoTime(tasks: Set<UTask>): Set<UnscheduledTask> {
  return S.filter<UnscheduledTask, UnscheduledTask>(
    Ref.not<UnscheduledTask, Task>(taskRef),
  )(tasks);
}

export function fromArray(tasks: UnscheduledTask[]): TasksContainer {
  return new TasksContainer().putMany(tasks);
}

export function fromSet(tasks: Set<UTask>): TasksContainer {
  return new TasksContainer().putMany(Array.from(tasks));
}

export function orEmpty(tasksContainer?: TasksContainer): TasksContainer {
  return tasksContainer ?? new TasksContainer();
}

export const ordMoment: Ord.Ord<Moment> = Ord.fromCompare(
  (first: Moment, second: Moment) => {
    if (first.isSame(second)) return 0;
    if (first.isAfter(second)) return 1;
    return -1;
  },
);

export const ordUnscheduledTaskByContent: Ord.Ord<UnscheduledTask> =
  Monoid.concatAll(Ord.getMonoid())([
    pipe(
      String.Ord,
      Ord.contramap((t: UnscheduledTask) => t.displayedText),
    ),
    pipe(
      String.Ord,
      Ord.contramap((t: UnscheduledTask) => t.firstLineText),
    ),
    pipe(
      Number.Ord,
      Ord.contramap((t: UnscheduledTask) => t.durationMinutes),
    ),
    pipe(
      ordMoment,
      Ord.contramap((t: UnscheduledTask) => t.day),
    ),
  ]);

export const ordTaskByContent: Ord.Ord<Task> = Monoid.concatAll(
  Ord.getMonoid(),
)([
  ordUnscheduledTaskByContent,
  pipe(
    ordMoment,
    Ord.contramap((t: Task) => t.startTime),
  ),
  pipe(
    Number.Ord,
    Ord.contramap((t: Task) => t.startMinutes),
  ),
]);

export const ordUTaskByContent: Ord.Ord<UTask> = Ord.fromCompare(
  (x: UTask, y: UTask) =>
    taskRef(x) && taskRef(y)
      ? ordTaskByContent.compare(x, y)
      : ordUnscheduledTaskByContent.compare(x, y),
);

export const eqMoment: Eq.Eq<Moment> = Eq.fromEquals((x: Moment, y: Moment) =>
  x.isSame(y),
);

export const eqUnscheduledTaskByContent: Eq.Eq<UnscheduledTask> = Eq.fromEquals(
  (x: UnscheduledTask, y: UnscheduledTask) =>
    x.displayedText == y.displayedText &&
    x.firstLineText == y.firstLineText &&
    x.durationMinutes == y.durationMinutes &&
    eqMoment.equals(x.day, y.day),
);

export const eqTaskByContent: Eq.Eq<Task> = Eq.fromEquals(
  (x: Task, y: Task) =>
    eqUnscheduledTaskByContent.equals(x, y) &&
    x.startTime.isSame(y.startTime) &&
    x.startMinutes == y.startMinutes,
);

export const eqUTaskByContent: Eq.Eq<UTask> = Eq.fromEquals(
  (x: UTask, y: UTask) =>
    taskRef(x) && taskRef(y)
      ? eqTaskByContent.equals(x, y)
      : eqUnscheduledTaskByContent.equals(x, y),
);

export const eqUTaskById: Eq.Eq<UTask> = Eq.contramap<string, UTask>(
  (t: UnscheduledTask) => t.id,
)(String.Eq);

const eqLoc: Eq.Eq<Loc> = Monoid.concatAll(Eq.getMonoid())([
  pipe(
    Number.Eq,
    Eq.contramap((lc: Loc) => lc.col),
  ),
  pipe(
    Number.Eq,
    Eq.contramap((lc: Loc) => lc.line),
  ),
  pipe(
    Number.Eq,
    Eq.contramap((lc: Loc) => lc.offset),
  ),
]);

const eqPos: Eq.Eq<Pos> = Monoid.concatAll(Eq.getMonoid())([
  pipe(
    eqLoc,
    Eq.contramap((p: Pos) => p.start),
  ),
  pipe(
    eqLoc,
    Eq.contramap((p: Pos) => p.end),
  ),
]);

const eqLocation: Eq.Eq<TaskLocation> = Monoid.concatAll(Eq.getMonoid())([
  pipe(
    String.Eq,
    Eq.contramap((tl: TaskLocation) => tl.path),
  ),
  pipe(
    Number.Eq,
    Eq.contramap((tl: TaskLocation) => tl.line),
  ),
  pipe(
    eqPos,
    Eq.contramap((tl: TaskLocation) => tl.position),
  ),
]);

export const eqTaskById: Eq.Eq<UnscheduledTask> = Eq.contramap(
  (t: UnscheduledTask) => t.id,
)(String.Eq);
export const eqTaskByLocation: Eq.Eq<UnscheduledTask> = Eq.contramap(
  (t: UnscheduledTask) => O.fromNullable(t.location),
)(O.getEq(eqLocation));

export const eqByContent: Eq.Eq<TasksContainer> = Eq.contramap(
  (ts: TasksContainer) => new Set(ts.allTasks.values()),
)(S.getEq(eqUTaskByContent));
export const eqByIds: Eq.Eq<TasksContainer> = Eq.contramap(
  (ts: TasksContainer) => new Set(ts.allTasks.keys()),
)(S.getEq(String.Eq));
export const eqByLocation: Eq.Eq<TasksContainer> = Eq.contramap(
  (ts: TasksContainer) => new Set(ts.allTasks.values()),
)(S.getEq(eqTaskByLocation));

export const eqByIdsAndContent: Eq.Eq<TasksContainer> = Monoid.concatAll(
  Eq.getMonoid(),
)([eqByIds, eqByContent]);
export const eqByContentAndLocation: Eq.Eq<TasksContainer> = Monoid.concatAll(
  Eq.getMonoid(),
)([eqByContent, eqByLocation]);
