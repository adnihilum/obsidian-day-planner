import { get } from "svelte/store";

import { defaultSettingsForTests } from "../../../../settings";
import { Tasks } from "../../../../types";
import { toMinutes } from "../../../../util/moment";
import { baseTask } from "../../test-utils";

import {
  baseTasks,
  day,
  dayKey,
  emptyTasks,
  nextDay,
  nextDayKey,
  unscheduledTask,
} from "./util/fixtures";
import { setUp } from "./util/setup";

describe("moving tasks between containers", () => {
  test("with no edit operation in progress, nothing happens on mouse move", () => {
    const { editHandlers, moveCursorTo, displayedTasks } = setUp({
      tasks: baseTasks,
    });

    const initial = get(displayedTasks);

    editHandlers.handleMouseEnter(day);
    moveCursorTo("01:00");

    expect(get(displayedTasks)).toEqual(initial);
  });

  test("scheduling works between days", () => {
    const { editHandlers, moveCursorTo, displayedTasks } = setUp({
      tasks: unscheduledTask,
    });

    editHandlers.handleGripMouseDown(baseTask);
    editHandlers.handleMouseEnter(nextDay);
    moveCursorTo("01:00");

    expect(get(displayedTasks)).toMatchObject({
      [dayKey]: {
        noTime: [],
        withTime: [],
      },
      [nextDayKey]: {
        withTime: [{ startMinutes: toMinutes("01:00") }],
      },
    });
  });

  test("drag works between days", () => {
    const tasks: Tasks = {
      [dayKey]: {
        withTime: [
          baseTask,
          { ...baseTask, id: "2", startMinutes: toMinutes("01:00") },
        ],
        noTime: [],
      },
      [nextDayKey]: {
        withTime: [{ ...baseTask, id: "3", startMinutes: toMinutes("01:00") }],
        noTime: [],
      },
    };

    const { editHandlers, moveCursorTo, displayedTasks } = setUp({
      tasks,
    });

    editHandlers.handleGripMouseDown(baseTask);
    editHandlers.handleMouseEnter(nextDay);
    moveCursorTo("01:00");

    expect(get(displayedTasks)).toMatchObject({
      [dayKey]: {
        withTime: [{ id: "2", startMinutes: toMinutes("01:00") }],
      },
      [nextDayKey]: {
        withTime: [
          { startMinutes: toMinutes("01:00") },
          { id: "3", startMinutes: toMinutes("01:00") },
        ],
      },
    });
  });

  test("drag many works between days", () => {
    const tasks: Tasks = {
      [dayKey]: {
        withTime: [
          baseTask,
          { ...baseTask, id: "2", startMinutes: toMinutes("01:00") },
        ],
        noTime: [],
      },
      [nextDayKey]: {
        withTime: [{ ...baseTask, id: "3", startMinutes: toMinutes("01:00") }],
        noTime: [],
      },
    };

    const { editHandlers, moveCursorTo, displayedTasks } = setUp({
      tasks,
      settings: { ...defaultSettingsForTests, editMode: "push" },
    });

    editHandlers.handleGripMouseDown(baseTask);
    editHandlers.handleMouseEnter(nextDay);
    moveCursorTo("01:00");

    expect(get(displayedTasks)).toMatchObject({
      [dayKey]: {
        withTime: [{ id: "2", startMinutes: toMinutes("01:00") }],
      },
      [nextDayKey]: {
        withTime: [
          { startMinutes: toMinutes("01:00") },
          { id: "3", startMinutes: toMinutes("02:00") },
        ],
      },
    });
  });

  test("create doesn't work between days", () => {
    const { editHandlers, moveCursorTo, displayedTasks } = setUp({
      tasks: emptyTasks,
    });

    moveCursorTo("01:00");
    editHandlers.handleContainerDblClick();
    editHandlers.handleMouseEnter(nextDay);
    moveCursorTo("02:00");

    expect(get(displayedTasks)).toMatchObject({
      [dayKey]: {
        withTime: [{ startMinutes: toMinutes("01:00"), durationMinutes: 60 }],
      },
      [nextDayKey]: {
        withTime: [],
      },
    });
  });

  test("resize doesn't work between days", () => {
    const { editHandlers, displayedTasks } = setUp();

    editHandlers.handleResizerMouseDown(baseTask);
    editHandlers.handleMouseEnter(nextDay);

    expect(get(displayedTasks)).toMatchObject({
      [dayKey]: {
        withTime: [{ id: "id" }],
      },
      [nextDayKey]: {
        withTime: [],
      },
    });
  });
});
