import { toMinutes } from "../../../../util/moment";
import { baseTask } from "../../test-utils";

import {
  emptyTasks,
  nextDay,
  nextDayKey,
  unscheduledTask,
} from "./util/fixtures";
import { setUp } from "./util/setup";

jest.mock("obsidian-daily-notes-interface", () => ({
  ...jest.requireActual("obsidian-daily-notes-interface"),
  getDateFromPath(): null {
    return null;
  },
}));

describe("Finding diff before writing updates to files", () => {
  test("Finds tasks moved between days", async () => {
    const { editHandlers, confirmEdit, props } = setUp();

    editHandlers.handleGripMouseDown(baseTask);
    editHandlers.handleMouseEnter(nextDay);

    await confirmEdit();

    expect(props.onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        updated: [
          expect.objectContaining({
            id: baseTask.id,
            firstLineText: expect.stringContaining(`⏳ ${nextDayKey}`),
          }),
        ],
      }),
    );
  });

  test("Finds created tasks", async () => {
    const { editHandlers, confirmEdit, props } = setUp({
      tasks: emptyTasks,
    });

    editHandlers.handleContainerDblClick();

    await confirmEdit();

    expect(props.onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        created: [expect.objectContaining({ startMinutes: 0 })],
        updated: [],
      }),
    );
  });

  test("Finds tasks moved within one day", async () => {
    const { editHandlers, confirmEdit, props, moveCursorTo } = setUp();

    editHandlers.handleGripMouseDown(baseTask);
    moveCursorTo("2:00");

    await confirmEdit();

    expect(props.onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        updated: [
          expect.objectContaining({
            startMinutes: toMinutes("2:00"),
          }),
        ],
        created: [],
      }),
    );
  });

  test("Finds newly scheduled tasks", async () => {
    const { editHandlers, confirmEdit, props, moveCursorTo } = setUp({
      tasks: unscheduledTask,
    });

    editHandlers.handleGripMouseDown(baseTask);
    moveCursorTo("2:00");

    await confirmEdit();

    expect(props.onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        created: [],
        updated: [
          expect.objectContaining({
            startMinutes: toMinutes("2:00"),
          }),
        ],
      }),
    );
  });
});
