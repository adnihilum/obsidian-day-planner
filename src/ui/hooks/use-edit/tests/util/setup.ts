import { noop } from "lodash/fp";
import { Moment } from "moment/moment";
import { PlanEditor } from "src/service/plan-editor";
import { TasksContainer } from "src/tasks-container";
import { writable } from "svelte/store";

import { ObsidianFacade } from "../../../../../service/obsidian-facade";
import {
  DayPlannerSettings,
  defaultSettingsForTests,
} from "../../../../../settings";
import { toMinutes } from "../../../../../util/moment";
import { useEditContext } from "../../use-edit-context";

import { baseTasks } from "./fixtures";

function createProps({
  tasks,
  settings,
}: {
  tasks: TasksContainer;
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
  const planEditor = null as PlanEditor; // TODO: fix this later
  const props = createProps({ tasks, settings });
  const { editHandlers, displayedTasks, confirmEdit } = useEditContext({
    ...props,
    planEditor,
  });

  // const todayDisplayedTasks = editHandlers.getDisplayedTasks(day);
  const { pointerOffsetY } = editHandlers;
  // const nextDayDisplayedTasks = editHandlers.getDisplayedTasks(nextDay);

  // this prevents the store from resetting;
  displayedTasks.subscribe(noop);

  function moveCursorTo(time: string, day?: Moment) {
    pointerOffsetY.set(toMinutes(time));
  }

  return {
    editHandlers,
    // todayDisplayedTasks,
    // nextDayDisplayedTasks,
    moveCursorTo,
    displayedTasks,
    confirmEdit,
    props,
  };
}
