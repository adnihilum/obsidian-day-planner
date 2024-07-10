import {
  derived,
  Readable,
  Unsubscriber,
  Writable,
  writable,
} from "svelte/store";

import { Tasks } from "../../../types";

import { transform } from "./transform/transform";
import { EditOperation } from "./types";
import { DayPlannerSettings } from "../../../settings";
import { TimeCursorHistory } from "./use-time-cursor";

export interface UseDisplayedTasksProps {
  editOperation: Readable<EditOperation>;
  timeCursorHistory: Readable<TimeCursorHistory>;
  baselineTasks: Readable<Tasks>;
  settings: Readable<DayPlannerSettings>;
}

interface DisplayedTaskProxyDataRecords {
  editOperation: EditOperation;
  timeCursorHistory: TimeCursorHistory;
  baselineTasks: Tasks;
  settings: DayPlannerSettings;
}

interface DisplayedTaskProxyDataChangeInfo {
  editOperation: boolean;
  timeCursorHistory: boolean;
  baselineTasks: boolean;
  settings: boolean;
}

interface DisplayedTaskProxyData {
  data: DisplayedTaskProxyDataRecords;
  changes: DisplayedTaskProxyDataChangeInfo;
}

function changedAnyThing(
  changeInfo: DisplayedTaskProxyDataChangeInfo,
): boolean {
  return (
    changeInfo.baselineTasks ||
    changeInfo.timeCursorHistory ||
    changeInfo.editOperation ||
    changeInfo.settings
  );
}

const emptyChanges: DisplayedTaskProxyDataChangeInfo = {
  baselineTasks: false,
  timeCursorHistory: false,
  editOperation: false,
  settings: false,
};

export function useDisplayedTasks({
  editOperation,
  baselineTasks,
  timeCursorHistory,
  settings,
}: UseDisplayedTasksProps) {
  const displayedTasksProxy: Writable<DisplayedTaskProxyData> = writable({
    data: {
      editOperation: undefined,
      timeCursorHistory: undefined,
      baselineTasks: undefined,
      settings: undefined,
    } as DisplayedTaskProxyDataRecords,
    changes: emptyChanges,
  });

  editOperation.subscribe((editOperation) => {
    displayedTasksProxy.update((displayedTasksData) => {
      return {
        data: { ...displayedTasksData.data, editOperation },
        changes: { ...displayedTasksData.changes, editOperation: true },
      };
    });
  });

  baselineTasks.subscribe((baselineTasks) => {
    displayedTasksProxy.update((displayedTasksData) => {
      return {
        data: { ...displayedTasksData.data, baselineTasks },
        changes: { ...displayedTasksData.changes, baselineTasks: true },
      };
    });
  });

  timeCursorHistory.subscribe((timeCursorHistory) => {
    displayedTasksProxy.update((displayedTasksData) => {
      return {
        data: { ...displayedTasksData.data, timeCursorHistory },
        changes: { ...displayedTasksData.changes, timeCursorHistory: true },
      };
    });
  });

  settings.subscribe((settings) => {
    displayedTasksProxy.update((displayedTasksData) => {
      return {
        data: { ...displayedTasksData.data, settings },
        changes: { ...displayedTasksData.changes, settings: true },
      };
    });
  });

  function updateDisplayedTasks(
    values: DisplayedTaskProxyData,
    set: (value: Tasks) => void,
  ): Unsubscriber | void {
    if (changedAnyThing(values.changes)) {
      displayedTasksProxy.update((proxyData) => {
        return { ...proxyData, changes: emptyChanges };
      });

      let newTasks = values.data.baselineTasks;
      let needChange = false;

      if (values.data.editOperation) {
        const transformationResult = transform(
          values.data.baselineTasks,
          values.data.timeCursorHistory,
          values.data.editOperation,
          values.data.settings,
        );

        if (transformationResult) {
          newTasks = transformationResult;
          needChange = true;
        }
      }

      if (
        values.changes.baselineTasks ||
        values.changes.settings ||
        needChange
      ) {
        set(newTasks);
      }
    }
  }

  return derived(displayedTasksProxy, updateDisplayedTasks);
}
