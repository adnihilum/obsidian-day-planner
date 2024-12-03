import type { Moment } from "moment";
import { Pos } from "obsidian";
import { Readable, Writable } from "svelte/store";

import type { ObsidianFacade } from "./service/obsidian-facade";
import { IcalConfig } from "./settings";
import { TasksContainer } from "./tasks-container";
import { ConfirmationModalProps } from "./ui/confirmation-modal";
import { useEditContext } from "./ui/hooks/use-edit/use-edit-context";
import { createShowPreview } from "./util/create-show-preview";

export interface TaskLocation {
  path: string;
  line: number;
  position: Pos;
}

export interface HorizontalPlacing {
  widthPercent: number;
  xOffsetPercent: number;
}

export interface UnscheduledTask {
  /**
   * @deprecated this will be replaced with dataview `symbol` and `status`
   */
  listTokens: string;

  // TODO: the distinction needs to be clearer

  // TODO:  add source firstLineText field
  // TODO:  add source restLines of text field
  // TODO:  add displaydText - md text to rendr in the schedule panel

  firstLineText: string;
  displayedText: string;

  id: string;
  location?: TaskLocation;
  placing?: HorizontalPlacing;
  isGhost?: boolean; //TODO: remove
  calendar?: IcalConfig;
  durationMinutes: number;

  day: Moment;
}

export interface Task extends UnscheduledTask {
  startTime: Moment;
  startMinutes: number;
}

export type RelationToNow = "past" | "present" | "future";

export type TimeBlock = Pick<Task, "startMinutes" | "durationMinutes" | "id">;

export interface Overlap {
  columns: number;
  span: number;
  start: number;
}

export type CleanUp = () => void;
export type RenderMarkdown = (el: HTMLElement, markdown: string) => CleanUp;

export interface ObsidianContext {
  obsidianFacade: ObsidianFacade;
  initWeeklyView: () => Promise<void>;
  refreshTasks: (source: string) => void;
  dataviewLoaded: Readable<boolean>;
  renderMarkdown: RenderMarkdown;
  editContext: ReturnType<typeof useEditContext>;
  visibleTasks: Readable<TasksContainer>;
  showReleaseNotes: () => void;
  showPreview: ReturnType<typeof createShowPreview>;
  isModPressed: Readable<boolean>;
  reSync: () => void;
  isOnline: Readable<boolean>;
  isDarkMode: Readable<boolean>;
  showConfirmationModal: (props: ConfirmationModalProps) => void;
}

export type ComponentContext = Map<string, unknown>;

declare global {
  const currentPluginVersion: string;
  const changelogMd: string;
}

export type WithIcalConfig<T> = T & { calendar: IcalConfig };

export type DateRange = Writable<Moment[]> & { untrack: () => void };
