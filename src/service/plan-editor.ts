import { groupBy } from "lodash/fp";
import type { CachedMetadata } from "obsidian";
import { getDateFromPath } from "obsidian-daily-notes-interface";

import { getHeadingByText, getListItemsUnderHeading } from "../parser/parser";
import type { DayPlannerSettings } from "../settings";
import type { PlacedTask, Task } from "../types";
import { createDailyNoteIfNeeded } from "../util/daily-notes";
import { updateTaskText } from "../util/task-utils";

import type { ObsidianFacade } from "./obsidian-facade";

export class PlanEditor {
  constructor(
    private readonly settings: () => DayPlannerSettings,
    private readonly obsidianFacade: ObsidianFacade,
  ) {}

  async ensureFilesForTasks(tasks: { dayKey: string; task: PlacedTask }[]) {
    return Promise.all(
      tasks.map(async ({ dayKey, task }) => {
        const { path } = await createDailyNoteIfNeeded(window.moment(dayKey));
        await createDailyNoteIfNeeded(task.startTime);

        if (task.location?.path) {
          return task;
        } else {
          return { ...task, location: { path } };
        }
      }),
    );
  }

  // todo: all except this can be re-written to use mdast
  syncTasksWithFile = async ({
    //TODO: what if we always look at task.startTime and task.location to get file? and to determine wheter the task is in daily notes or other file
    updated,
    created,
    moved,
  }: {
    updated: Task[];
    created: { dayKey: string; task: PlacedTask }[];
    moved: { dayKey: string; task: PlacedTask }[];
  }) => {
    if (created.length > 0) {
      const [task] = await this.ensureFilesForTasks(created);

      const noteForFile = await createDailyNoteIfNeeded(
        window.moment(created[0].dayKey),
      );

      const filePathToEdit = getDateFromPath(task.location?.path, "day")
        ? noteForFile.path
        : task.location?.path;

      return this.obsidianFacade.editFile(filePathToEdit, (contents) => {
        // @ts-ignore
        return this.writeTaskToFileContents(task, contents, filePathToEdit);
      });
    }

    if (moved.length > 0) {
      const [task] = await this.ensureFilesForTasks(moved);

      const noteForFile = await createDailyNoteIfNeeded(
        window.moment(moved[0].dayKey),
      );

      const updated = updateTaskText(task as Task);

      return Promise.all([
        this.obsidianFacade.editFile(noteForFile.path, (contents) => {
          // @ts-ignore
          return this.writeTaskToFileContents(
            updated,
            contents,
            noteForFile.path,
          );
        }),
        this.obsidianFacade.editFile(task.location.path, (contents) => {
          // @ts-ignore
          return this.removeTaskFromFileContents(task, contents);
        }),
      ]);
    }

    const pathToEditedTasksLookup = groupBy(
      (task) => task.location.path,
      updated,
    );

    const editPromises = Object.keys(pathToEditedTasksLookup).map(
      async (path) =>
        await this.obsidianFacade.editFile(path, (contents) =>
          pathToEditedTasksLookup[path].reduce(
            (result, current) => this.updateTaskInFileContents(result, current),
            contents,
          ),
        ),
    );

    return Promise.all(editPromises);
  };

  writeTaskToFileContents(task: Task, contents: string, path: string) {
    // todo: we can use dataview
    const metadata = this.obsidianFacade.getMetadataForPath(path) || {};
    const [planEndLine, splitContents] = this.getPlanEndLine(
      contents.split("\n"),
      metadata,
    );

    const result = [...splitContents];

    const newTaskText = [
      task.firstLineText, //TODO: text already is updated here, isn't it?
      ...task.displayedText.split("\n").slice(1), //TODO: displayed text shouldn't be used here
    ].join("\n");

    result.splice(planEndLine + 1, 0, newTaskText);

    return result.join("\n");
  }

  removeTaskFromFileContents(task: Task, contents: string) {
    const newContents = contents.split("\n");
    const taskLinesCount = task.displayedText.split("\n").length - 1; //TODO: displayed text shouldn't be used here
    newContents.splice(task.location.position.start.line, taskLinesCount);

    return newContents.join("\n");
  }

  createPlannerHeading() {
    const { plannerHeading, plannerHeadingLevel } = this.settings();

    const headingTokens = "#".repeat(plannerHeadingLevel);

    return `${headingTokens} ${plannerHeading}`;
  }

  private updateTaskInFileContents(contents: string, task: Task) {
    return contents
      .split("\n")
      .map((line, index) => {
        if (index === task.location?.line) {
          return (
            line.substring(0, task.location.position.start.col) +
            task.firstLineText
          );
        }

        return line;
      })
      .join("\n");
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
