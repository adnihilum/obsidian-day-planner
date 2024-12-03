import { groupBy } from "lodash/fp";
import type { CachedMetadata } from "obsidian";

import { getHeadingByText, getListItemsUnderHeading } from "../parser/parser";
import type { DayPlannerSettings } from "../settings";
import type { Task } from "../types";
import { createDailyNoteIfNeeded, fileIsADailyNode } from "../util/daily-notes";
import { renderToMDFirstLine } from "../util/task-utils";

import type { ObsidianFacade } from "./obsidian-facade";

export interface PlanEditorRequest {
  updated: Task[];
  created: Task[];
  removed: Task[];
}

export class PlanEditor {
  constructor(
    private readonly settings: () => DayPlannerSettings,
    private readonly obsidianFacade: ObsidianFacade,
  ) {
    this.ensureFilesForTask = this.ensureFilesForTask.bind(this);
    this.syncTasksWithFile = this.syncTasksWithFile.bind(this);
  }

  async ensureFilesForTask(task: Task): Promise<Task> {
    const { path } = await createDailyNoteIfNeeded(task.day);

    if (
      task.location?.path &&
      (!fileIsADailyNode(task.location?.path) || path == task.location?.path)
    ) {
      return task;
    } else {
      return {
        ...task,
        location: { path, line: undefined, position: undefined },
      };
    }
  }

  // todo: all except this can be re-written to use mdast
  //TODO: what if we always look at task.startTime and task.location to get file? and to determine wheter the task is in daily notes or other file

  async syncTasksWithFile(editRequest: PlanEditorRequest): Promise<void> {
    // const self = this;
    await Promise.all(
      editRequest.created.map(async (taskRaw) => {
        const task = await this.ensureFilesForTask(taskRaw);
        const filePathToEdit = task.location!.path;
        await this.obsidianFacade.editFile(
          filePathToEdit,
          this.addTaskToFileContents(task, filePathToEdit),
        );
      }),
    );

    await Promise.all(
      editRequest.removed.map(async (taskRaw) => {
        const task = await this.ensureFilesForTask(taskRaw);
        await this.obsidianFacade.editFile(
          task.location!.path,
          this.removeTaskFromFileContents(task),
        );
      }),
    );

    const pathToEditedTasksLookup = groupBy(
      (task) => task.location.path,
      editRequest.updated,
    );

    await Promise.all(
      Object.keys(pathToEditedTasksLookup).map(
        async (path) =>
          await this.obsidianFacade.editFile(path, (contents) =>
            pathToEditedTasksLookup[path].reduce(
              (result, currentTask) =>
                this.updateTaskInFileContents(currentTask)(result),
              contents,
            ),
          ),
      ),
    );
  }

  addTaskToFileContents(
    task: Task,
    path: string,
  ): (contents: string) => string {
    return (contents: string) => {
      // todo: we can use dataview
      const metadata = this.obsidianFacade.getMetadataForPath(path) || {};
      const [planEndLine, splitContents] = this.getPlanEndLine(
        contents.split("\n"),
        metadata,
      );

      const result = [...splitContents];

      const newTaskText = [
        renderToMDFirstLine(task),
        ...task.displayedText.split("\n").slice(1), //TODO: displayed text shouldn't be used here
      ].join("\n");

      result.splice(planEndLine + 1, 0, newTaskText);

      return result.join("\n");
    };
  }

  removeTaskFromFileContents(task: Task): (contents: string) => string {
    return (contents: string) => {
      const newContents = contents.split("\n");
      const taskLinesCount = task.displayedText.split("\n").length - 1; //TODO: displayed text shouldn't be used here
      newContents.splice(task.location.position.start.line, taskLinesCount);

      return newContents.join("\n");
    };
  }

  createPlannerHeading() {
    const { plannerHeading, plannerHeadingLevel } = this.settings();

    const headingTokens = "#".repeat(plannerHeadingLevel);

    return `${headingTokens} ${plannerHeading}`;
  }

  private updateTaskInFileContents(task: Task): (contents: string) => string {
    return (contents: string) => {
      return contents
        .split("\n")
        .map((line, index) => {
          if (index === task.location?.line) {
            return (
              line.substring(0, task.location.position.start.col) +
              renderToMDFirstLine(task)
            );
          }

          return line;
        })
        .join("\n");
    };
  }

  private getPlanEndLine(
    contents: string[],
    metadata: CachedMetadata,
  ): [number, string[]] {
    const planHeading = getHeadingByText(
      metadata,
      this.settings().plannerHeading,
    );

    const planListItems = getListItemsUnderHeading(
      metadata,
      this.settings().plannerHeading,
    );

    if (planListItems?.length > 0) {
      const lastListItem = planListItems[planListItems.length - 1];

      return [lastListItem.position.start.line, contents];
    }

    if (planHeading) {
      return [planHeading.position.start.line, contents];
    }

    const withNewPlan = [...contents, "", this.createPlannerHeading(), ""];

    return [withNewPlan.length, withNewPlan];
  }
}
