import { get } from "svelte/store";

import { toMinutes } from "../../../../util/moment";
import { baseTask } from "../../test-utils";

import { dayKey, nextDay } from "./util/fixtures";
import { setUp } from "./util/setup";

// todo: remove duplication, ideally this check should be pulled out of the diffing logic
jest.mock("obsidian-daily-notes-interface", () => ({
  ...jest.requireActual("obsidian-daily-notes-interface"),
  getDateFromPath(): null {
    return null;
  },
}));

describe("drag one & common edit mechanics", () => {
  test("after edit confirmation, tasks freeze and stop reacting to cursor", async () => {
    const { editHandlers, moveCursorTo, displayedTasks, confirmEdit } = setUp();

    editHandlers.handleGripMouseDown(baseTask);
    moveCursorTo("01:00");
    await confirmEdit();
    editHandlers.handleMouseEnter(nextDay);
    moveCursorTo("03:00");

    expect(get(displayedTasks)).toMatchObject({
      [dayKey]: {
        withTime: [{ startMinutes: toMinutes("01:00") }],
      },
    });
  });

  test("when a task is set to its current time, nothing happens", async () => {
    const { editHandlers, confirmEdit, props } = setUp();

    editHandlers.handleGripMouseDown(baseTask);
    await confirmEdit();

    expect(props.onUpdate).not.toHaveBeenCalled();
  });
});
