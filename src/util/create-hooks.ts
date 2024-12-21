import { filter, flatten, flow, isEmpty } from "lodash/fp";
import { App } from "obsidian";
import { TasksContainer } from "src/tasks-container";
import * as TC from "src/tasks-container";
import * as SU from "src/util/storage/storageUtils";

import { derived, Readable, readable, writable, Writable } from "svelte/store";

import { icalRefreshIntervalMillis, reQueryAfterMillis } from "../constants";
import { currentTime } from "../global-store/current-time";
import { DataviewFacade } from "../service/dataview-facade";
import { ObsidianFacade } from "../service/obsidian-facade";
import { PlanEditor } from "../service/plan-editor";
import { DayPlannerSettings } from "../settings";
import { UnscheduledTask } from "../types";
import { useDataviewChange } from "../ui/hooks/use-dataview-change";
import { useDataviewLoaded } from "../ui/hooks/use-dataview-loaded";
import { useDataviewTasks } from "../ui/hooks/use-dataview-tasks";
import { useDateRanges } from "../ui/hooks/use-date-ranges";
import { useDebounceWithDelay } from "../ui/hooks/use-debounce-with-delay";
import { useEditContext } from "../ui/hooks/use-edit/use-edit-context";
import { useIsOnline } from "../ui/hooks/use-is-online";
import { useKeyDown } from "../ui/hooks/use-key-down";
import { useListsFromVisibleDailyNotes } from "../ui/hooks/use-lists-from-visible-daily-notes";
import { useModPressed } from "../ui/hooks/use-mod-pressed";
import { useNewlyStartedTasks } from "../ui/hooks/use-newly-started-tasks";
import { useTasksFromExtraSources } from "../ui/hooks/use-tasks-from-extra-sources";
import { useVisibleDailyNotes } from "../ui/hooks/use-visible-daily-notes";
import { useVisibleDataviewTasks } from "../ui/hooks/use-visible-dataview-tasks";
import { useVisibleDays } from "../ui/hooks/use-visible-days";

import { canHappenAfter, icalEventToTasks } from "./ical";
import { getEarliestMoment } from "./moment";
import { createBackgroundBatchScheduler } from "./scheduler";
import { getUpdateTrigger } from "./store";
import { getDayKey } from "./tasks-utils";
import { useIcalEvents } from "./use-ical-events";

interface CreateHooksProps {
  app: App;
  dataviewFacade: DataviewFacade;
  obsidianFacade: ObsidianFacade;
  settingsStore: Writable<DayPlannerSettings>;
  planEditor: PlanEditor;
}

function getDarkModeFlag() {
  return document.body.hasClass("theme-dark");
}

export function createHooks({
  app,
  dataviewFacade,
  obsidianFacade,
  settingsStore,
  planEditor,
}: CreateHooksProps) {
  const dataviewSource = derived(settingsStore, ($settings) => {
    return $settings.dataviewSource;
  });
  const layoutReady = readable(false, (set) => {
    app.workspace.onLayoutReady(() => set(true));
  });

  const isDarkMode = readable(getDarkModeFlag(), (set) => {
    const eventRef = app.workspace.on("css-change", () => {
      set(getDarkModeFlag());
    });

    return () => {
      app.workspace.offref(eventRef);
    };
  });

  // todo: these can be global stores
  const keyDown = useKeyDown();
  const isModPressed = useModPressed();
  const isOnline = useIsOnline();
  // ---

  const dataviewChange = useDataviewChange(app.metadataCache);
  const dataviewLoaded = useDataviewLoaded(app);

  const icalRefreshTimer = readable(getUpdateTrigger(), (set) => {
    const interval = setInterval(() => {
      set(getUpdateTrigger());
    }, icalRefreshIntervalMillis);

    return () => {
      clearInterval(interval);
    };
  });

  const icalSyncTrigger = writable();
  const combinedIcalSyncTrigger = derived(
    [icalRefreshTimer, icalSyncTrigger],
    getUpdateTrigger,
  );

  const icalEvents = useIcalEvents(
    settingsStore,
    combinedIcalSyncTrigger,
    isOnline,
  );

  const dateRanges = useDateRanges();
  const visibleDays = useVisibleDays(dateRanges.ranges);

  const currentDate = SU.removeDups(TC.eqMoment)(
    derived(currentTime, ($currentTime) => $currentTime.clone().startOf("day")),
  );
  const todayTimeRangeTracker = dateRanges.trackRange([]);
  currentDate.subscribe((today) => todayTimeRangeTracker.set([today]));

  // todo: improve naming
  const schedulerQueue = derived(
    [icalEvents, visibleDays],
    ([$icalEvents, $visibleDays]) => {
      if (isEmpty($icalEvents) || isEmpty($visibleDays)) {
        return [];
      }

      const earliestDay = getEarliestMoment($visibleDays);
      const startOfEarliestDay = earliestDay.clone().startOf("day").toDate();
      const relevantIcalEvents = $icalEvents.filter((icalEvent) =>
        canHappenAfter(icalEvent, startOfEarliestDay),
      );

      // todo: make it easier to understand
      return relevantIcalEvents.flatMap((icalEvent) => {
        return $visibleDays.map(
          (day) => () => icalEventToTasks(icalEvent, day),
        );
      });
    },
  );

  const tasksFromEvents = readable<Array<ReturnType<typeof icalEventToTasks>>>(
    [],
    (set) => {
      const scheduler =
        createBackgroundBatchScheduler<ReturnType<typeof icalEventToTasks>>(
          set,
        );

      return schedulerQueue.subscribe(scheduler.enqueueTasks);
    },
  );

  const visibleDayToEventOccurences: Readable<TasksContainer> = derived(
    tasksFromEvents,
    flow(filter(Boolean), flatten, (tasks: UnscheduledTask[]) => {
      TC.fromArray(tasks);
    }),
  );

  const taskUpdateTrigger = derived(
    [dataviewChange, dataviewSource],
    getUpdateTrigger,
  );
  const debouncedTaskUpdateTrigger = useDebounceWithDelay(
    taskUpdateTrigger,
    keyDown,
    reQueryAfterMillis,
  );
  const visibleDailyNotes = useVisibleDailyNotes(
    layoutReady,
    debouncedTaskUpdateTrigger,
    visibleDays,
  );
  const listsFromVisibleDailyNotes = useListsFromVisibleDailyNotes(
    visibleDailyNotes,
    debouncedTaskUpdateTrigger,
    dataviewFacade,
  );
  const tasksFromExtraSources = useTasksFromExtraSources({
    dataviewSource,
    debouncedTaskUpdateTrigger,
    visibleDailyNotes,
    dataviewFacade,
  });
  const dataviewTasks = useDataviewTasks({
    listsFromVisibleDailyNotes,
    tasksFromExtraSources,
    settingsStore,
  });
  const visibleDataviewTasks = useVisibleDataviewTasks(
    dataviewTasks,
    visibleDays,
  );

  const visibleTasks = derived(
    [visibleDataviewTasks, visibleDayToEventOccurences],
    ([$visibleDataviewTasks, $visibleDayToEventOccurences]) =>
      $visibleDataviewTasks.union(TC.orEmpty($visibleDayToEventOccurences)),
  );

  // currentDate.subscribe((dd) => console.log(`currentDate = ${dd}`));

  const tasksForToday = derived(
    [visibleTasks, currentDate],
    ([$visibleTasks, $currentDate]) => {
      const tasksForDayRaw =
        $visibleTasks.byDate.get(getDayKey($currentDate)) ?? new Set();
      return TC.fromSet(tasksForDayRaw);
    },
  );

  const editContext = useEditContext({
    obsidianFacade,
    settings: settingsStore,
    visibleTasks,
    planEditor,
  });

  const newlyStartedTasks = useNewlyStartedTasks({
    settings: settingsStore,
    tasksForToday,
    currentTime,
  });

  return {
    editContext,
    tasksForToday,
    visibleTasks,
    dataviewLoaded,
    newlyStartedTasks,
    isModPressed,
    icalSyncTrigger,
    isOnline,
    isDarkMode,
    dateRanges,
  };
}
