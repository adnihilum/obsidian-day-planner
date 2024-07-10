import { noop } from "lodash/fp";
import { Moment } from "moment/moment";
import { writable } from "svelte/store";

import { ObsidianFacade } from "../../../../../service/obsidian-facade";
import {
  DayPlannerSettings,
  defaultSettingsForTests,
} from "../../../../../settings";
import { Tasks } from "../../../../../types";
import { toMinutes } from "../../../../../util/moment";
import { useEditContext } from "../../use-edit-context";

import { baseTasks, day, nextDay } from "./fixtures";

function createProps({
  tasks,
  settings,
}: {
  tasks: Tasks;
  settings: DayPlannerSettings;
}) {
  const onUpdate = jest.fn();
  const obsidianFacade = jest.fn() as unknown as ObsidianFacade;

  return {
    settings: writable(settings),
    onUpdate,
    obsidianFacade,
    visibleTasks: writable(tasks),
  };
}

export function setUp({
  tasks = baseTasks,
  settings = defaultSettingsForTests,
} = {}) {
  const props = createProps({ tasks, settings });
  const { editHandlers, displayedTasks, confirmEdit } = useEditContext(props);

  const todayDisplayedTasks = editHandlers.getDisplayedTasks(day);
  const { pointerOffsetY } = editHandlers;
  const nextDayDisplayedTasks = editHandlers.getDisplayedTasks(nextDay);

  // this prevents the store from resetting;
  displayedTasks.subscribe(noop);

  function moveCursorTo(time: string, day?: Moment) {
    pointerOffsetY.set(toMinutes(time));
  }

  return {
    editHandlers,
    todayDisplayedTasks,
    nextDayDisplayedTasks,
    moveCursorTo,
    displayedTasks,
    confirmEdit,
    props,
  };
}
