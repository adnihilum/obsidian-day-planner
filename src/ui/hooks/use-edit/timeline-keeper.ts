import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import { PlanEditor, PlanEditorRequest } from "src/service/plan-editor";
import * as TC from "src/tasks-container";
import { TasksContainer } from "src/tasks-container";
import { Task } from "src/types";
import { fileIsADailyNode } from "src/util/daily-notes";
import { writable, Writable } from "svelte/store";

import { SimpleEditOperation } from "./simple-edit-operation";
import { compareTasks, TasksComparrison } from "./tasks-comparrison";

class ResettableTimer {
  timerId: O.Option<number>;
  callback: () => void;
  delay: number;

  constructor(callback: () => void, delay: number) {
    this.timerId = O.none;
    this.callback = callback;
    this.delay = delay;
    this.reset = this.reset.bind(this);
    this.cancel = this.cancel.bind(this);
  }

  reset(): void {
    this.cancel();
    const newTimerId = setTimeout(
      this.callback,
      this.delay,
    ) as unknown as number;
    this.timerId = O.some(newTimerId);
  }

  cancel(): void {
    O.map<number, void>((timerId) => clearTimeout(timerId))(this.timerId);
  }
}

export class TimelineKeeper {
  tasksFromDisk: TasksContainer;

  initialTasks: TasksContainer;

  pendingSimpleEditOperations: Array<SimpleEditOperation>;

  tasksAfterPendingEditOperations: TasksContainer;

  activeSimpleEditOperations: Array<SimpleEditOperation>;

  displayedTasks: TasksContainer;

  displayedTasksStore: Writable<TasksContainer>;

  planEditor: PlanEditor;

  idleTimerId: ResettableTimer;

  constructor(planEditor: PlanEditor) {
    this.tasksFromDisk = new TasksContainer();
    this.initialTasks = new TasksContainer();
    this.pendingSimpleEditOperations = [];
    this.tasksAfterPendingEditOperations = new TasksContainer();
    this.activeSimpleEditOperations = [];
    this.displayedTasks = new TasksContainer();
    this.displayedTasksStore = writable(this.displayedTasks);
    this.displayedTasksStore.subscribe((tc) =>
      console.log(`displayedTasks length = ${tc.allTasks.size}`),
    );
    this.planEditor = planEditor;
  }

  private panicOnTasksFromDisk(newTasks: TasksContainer): void {
    console.log("panicOnTasksFromDisk !");
    this.tasksFromDisk = newTasks;
    this.initialTasks = newTasks;
    this.pendingSimpleEditOperations = [];
    this.tasksAfterPendingEditOperations = this.initialTasks;
    this.activeSimpleEditOperations = [];
    this.displayedTasks = this.initialTasks;

    this.displayedTasksStore.set(this.initialTasks);
    this.diskChangesWaitTimeout = this.diskChangesWaitTimeout.bind(this);
    this.idleTimerId = new ResettableTimer(
      this.diskChangesWaitTimeout,
      1 * 60 * 1000,
    );
  }

  private copyFileCoordinatesFromBinded(
    tasksComp: TasksComparrison,
  ): TasksContainer {
    return pipe(
      tasksComp.bindTasksPair,
      A.map(([newTask, oldTask]) => ({
        ...oldTask,
        location: newTask.location,
      })),
      TC.fromArray,
    );
  }

  diskChangesWaitTimeout(): void {
    console.log("timed out of waiting a new state from disk, continue!");
    this.writeNextPendingSimpleEditOperation();
  }

  private createEditRequest(tasksComp: TasksComparrison): PlanEditorRequest {
    const bindedTasksWithTime = pipe(
      tasksComp.bindTasksPair,
      A.filter(([nt, ot]) => TC.taskRef(ot)),
      A.map(([nt, ot]) => [nt as Task, ot as Task]),
      A.filter(([nt, ot]) => !TC.eqTaskByContent.equals(nt, ot)),
    );

    const updatedWithChangedDay = pipe(
      bindedTasksWithTime,
      A.filter(([nt, ot]) => !TC.eqMoment.equals(nt.day, ot.day)),
    );

    const writenInDailyNote: (task: Task) => boolean = (task: Task) => {
      return task.location?.path && fileIsADailyNode(task.location?.path);
    };

    const updatedWithChangedDayInDailyNotes = pipe(
      updatedWithChangedDay,
      A.filter(([nt, ot]) => writenInDailyNote(ot)),
    );

    const updatedWithChangedDayNotInDailyNotes = pipe(
      updatedWithChangedDay,
      A.filter(([nt, ot]) => !writenInDailyNote(ot)),
      A.map(([nt, ot]) => nt),
    );

    const updatedWithChangeTimeOnly = pipe(
      bindedTasksWithTime,
      A.filter(([nt, ot]) => TC.eqMoment.equals(nt.day, ot.day)),
      A.map(([nt, ot]) => nt),
    );

    const filterTasks = A.filter(TC.taskRef);
    const dailyTasksToCreate = pipe(
      updatedWithChangedDayInDailyNotes,
      A.map(([nt, ot]) => nt),
    );
    const dailyTasksToRemove = pipe(
      updatedWithChangedDayInDailyNotes,
      A.map(([nt, ot]) => ot),
    );

    //TODO:  add support for changing event text and other changes
    //TODO:  add support for unscheduled events

    const editRequest: PlanEditorRequest = {
      updated: A.concat(updatedWithChangedDayNotInDailyNotes)(
        updatedWithChangeTimeOnly,
      ),

      created: A.concat(dailyTasksToCreate)(filterTasks(tasksComp.newTasksRem)),

      removed: A.concat(dailyTasksToRemove)(filterTasks(tasksComp.oldTasksRem)),
    };

    console.log(`editRequest:\n${JSON.stringify(editRequest, null, 2)}`);

    return editRequest;
  }

  private writeNextPendingSimpleEditOperation(): boolean {
    const dataHasBeenWritten = pipe(
      A.head(this.pendingSimpleEditOperations),
      O.map((seo: SimpleEditOperation) => {
        pipe(
          this.createEditRequest(
            compareTasks(
              seo.apply(this.initialTasks),
              this.initialTasks,
              TC.ordUTaskById,
            ),
          ),
          this.planEditor.syncTasksWithFile,
        );

        this.idleTimerId.reset();
        return {};
      }),
      O.isSome,
    );

    if (!dataHasBeenWritten) {
      this.idleTimerId.cancel();
    }

    return dataHasBeenWritten;
  }

  changedTasksFromDisk(newTasks: TasksContainer): void {
    this.tasksFromDisk = newTasks;

    const expectedTasks = pipe(
      A.head(this.pendingSimpleEditOperations),
      O.fold(
        () => this.initialTasks,
        (commitedEditOperation: SimpleEditOperation) =>
          commitedEditOperation.apply(this.initialTasks),
      ),
    );

    function somethingHasChanged(tc: TasksComparrison): boolean {
      return tc.newTasksRem.length > 0 || tc.oldTasksRem.length > 0;
    }

    const compOfCommitedTasks = compareTasks(
      newTasks,
      expectedTasks,
      TC.ordUTaskByContent,
    );

    const compOfCurrentTasks = compareTasks(
      newTasks,
      this.initialTasks,
      TC.ordUTaskByContent,
    );

    if (!somethingHasChanged(compOfCurrentTasks)) {
      console.log("changes only in location inside files, continue!");
      this.initialTasks =
        this.copyFileCoordinatesFromBinded(compOfCommitedTasks);
    } else if (somethingHasChanged(compOfCommitedTasks)) {
      console.log("unexpected data from the disk!");
      console.log(
        `newTasksRem: \n${JSON.stringify(compOfCommitedTasks.newTasksRem, null, 2)}`,
      );
      console.log(
        `oldTasksRem: \n${JSON.stringify(compOfCommitedTasks.oldTasksRem, null, 2)}`,
      );

      this.panicOnTasksFromDisk(newTasks);
    } else {
      console.log("changes are expected, continue !");

      const newInitialTasks =
        this.copyFileCoordinatesFromBinded(compOfCommitedTasks);
      this.initialTasks = newInitialTasks;

      this.pendingSimpleEditOperations = pipe(
        A.tail(this.pendingSimpleEditOperations),
        O.getOrElse<SimpleEditOperation[]>(() => []),
      );

      const writtenNextSEO = this.writeNextPendingSimpleEditOperation();
      if (!writtenNextSEO && this.activeSimpleEditOperations.length == 0) {
        this.tasksAfterPendingEditOperations = this.initialTasks;
        this.displayedTasks = this.initialTasks;
        this.displayedTasksStore.set(this.initialTasks);
      }
    }
  }

  //////////////////////////
  ////   edit operation ////
  //////////////////////////

  private filteroutTrivialSEO(
    tasks: TasksContainer,
    seos: SimpleEditOperation[],
  ): SimpleEditOperation[] {
    const rawFilteredSEO = A.unfold<
      O.Option<SimpleEditOperation>,
      [TasksContainer, SimpleEditOperation[]]
    >([tasks, seos], ([curTasks, operations]) => {
      return pipe(
        A.head(operations),
        O.flatMap((curOperation) => {
          const nextTasks = curOperation.apply(curTasks);

          const maybeOperation: O.Option<SimpleEditOperation> =
            !TC.eqByContent.equals(curTasks, nextTasks)
              ? O.some(curOperation)
              : O.none;

          return pipe(
            A.tail(operations),
            O.map((restOperations) => {
              const newAcc: [TasksContainer, SimpleEditOperation[]] = [
                nextTasks,
                restOperations,
              ];
              return [maybeOperation, newAcc];
            }),
          );
        }),
      );
    });

    return pipe(rawFilteredSEO, A.flatMap(A.fromOption));
  }

  applyEdit(simpleEditOperations: SimpleEditOperation[]): void {
    try {
      this.activeSimpleEditOperations = simpleEditOperations;
      this.displayedTasks = A.reduce(
        this.tasksAfterPendingEditOperations,
        (accTasks, seo: SimpleEditOperation) => seo.apply(accTasks),
      )(this.activeSimpleEditOperations);
      this.displayedTasksStore.set(this.displayedTasks);
    } catch (error) {
      console.error(`exception in applyEdit, rolling back`, error);
      this.activeSimpleEditOperations = [];
      this.displayedTasks = this.tasksAfterPendingEditOperations;
      this.displayedTasksStore.set(this.displayedTasks);
    }
  }

  cancelEdit(): void {
    console.log("cancelEdit!");
    this.activeSimpleEditOperations = [];
    this.displayedTasksStore.set(this.tasksAfterPendingEditOperations);
    this.displayedTasks = this.tasksAfterPendingEditOperations;
  }

  confirmEdit(): void {
    console.log("confirmEdit!");

    const thereWerePendingEditOperations =
      this.pendingSimpleEditOperations.length > 0;

    const oldPendingSimpleEditOperations = this.pendingSimpleEditOperations;
    const oldTasksAfterPendingEditOperations =
      this.tasksAfterPendingEditOperations;

    try {
      const filteredActiveSEOs = this.filteroutTrivialSEO(
        this.tasksAfterPendingEditOperations,
        this.activeSimpleEditOperations,
      );
      this.pendingSimpleEditOperations = A.concat(filteredActiveSEOs)(
        this.pendingSimpleEditOperations,
      );
      this.activeSimpleEditOperations = [];
      this.tasksAfterPendingEditOperations = this.displayedTasks;
    } catch (error) {
      console.error("exception in confirmEdit, rolling back!", error);
      this.pendingSimpleEditOperations = oldPendingSimpleEditOperations;
      this.tasksAfterPendingEditOperations = oldTasksAfterPendingEditOperations;
      this.activeSimpleEditOperations = [];
      this.displayedTasks = this.tasksAfterPendingEditOperations;
      this.displayedTasksStore.set(this.displayedTasks);
    }

    const thereArePendingEditOperations =
      this.pendingSimpleEditOperations.length > 0;

    if (!thereWerePendingEditOperations && thereArePendingEditOperations) {
      this.writeNextPendingSimpleEditOperation();
    }
  }
}
