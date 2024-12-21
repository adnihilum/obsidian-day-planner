import { ItemView, WorkspaceLeaf } from "obsidian";

import { dateRangeContextKey, viewTypeTimeline } from "../constants";
import type { DayPlannerSettings } from "../settings";
import type { ComponentContext, DateRange } from "../types";
import { handleActiveLeafChange } from "../util/handle-active-leaf-change";

import TimelineWithControls from "./components/timeline-with-controls.svelte";
import { useDateRanges } from "./hooks/use-date-ranges";

export default class TimelineView extends ItemView {
  private timeline: TimelineWithControls;
  private dateRange: DateRange;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly settings: () => DayPlannerSettings,
    private readonly componentContext: ComponentContext,
    private readonly dateRanges: ReturnType<typeof useDateRanges>,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return viewTypeTimeline;
  }

  getDisplayText(): string {
    return "Day Planner Timeline";
  }

  getIcon() {
    return this.settings().timelineIcon;
  }

  async onOpen() {
    const contentEl = this.containerEl.children[1];

    this.dateRange = this.dateRanges.trackRange([
      window.moment().startOf("day"),
    ]);
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) =>
        handleActiveLeafChange(leaf, this.dateRange),
      ),
    );

    const context = new Map([
      ...this.componentContext,
      [dateRangeContextKey, this.dateRange],
    ]);

    this.timeline = new TimelineWithControls({
      target: contentEl,
      context,
    });
  }

  async onClose() {
    this.dateRange.untrack();
    this.timeline?.$destroy();
  }
}
