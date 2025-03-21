<script lang="ts">
  import { Moment } from "moment";
  import { getContext } from "svelte";
  import { Writable } from "svelte/store";

  import { dateRangeContextKey, obsidianContext } from "../../../constants";
  import { getVisibleHours } from "../../../global-store/derived-settings";
  import { settings } from "../../../global-store/settings";
  import type { ObsidianContext } from "../../../types";
  import { isToday } from "../../../util/moment";
  import ControlButton from "../control-button.svelte";
  import GlobalHandlers from "../global-handlers.svelte";
  import Ruler from "../ruler.svelte";
  import Scroller from "../scroller.svelte";
  import Timeline from "../timeline.svelte";
  import UnscheduledTaskContainer from "../unscheduled-task-container.svelte";

  const { obsidianFacade } = getContext<ObsidianContext>(obsidianContext);
  const dateRange = getContext<Writable<Moment[]>>(dateRangeContextKey);

  let weekHeaderRef: HTMLDivElement | undefined;

  function handleScroll(event: Event) {
    if (weekHeaderRef) {
      // @ts-expect-error
      weekHeaderRef.scrollLeft = event.target?.scrollLeft;
    }
  }
</script>

<GlobalHandlers />

<div bind:this={weekHeaderRef} class="week-header">
  <div class="header-row day-buttons">
    <div class="corner"></div>
    {#each $dateRange as day}
      <div class="header-cell" class:today={isToday(day)}>
        <ControlButton
          --color={isToday(day) ? "white" : "var(--icon-color)"}
          label="Open note for day"
          on:click={async () => await obsidianFacade.openFileForDay(day)}
        >
          {day.format($settings.timelineDateFormat)}
        </ControlButton>
      </div>
    {/each}
  </div>

  <div class="header-row">
    <div class="corner"></div>
    {#each $dateRange as day}
      <div class="header-cell">
        <UnscheduledTaskContainer {day} />
      </div>
    {/each}
  </div>
</div>

<Scroller on:scroll={handleScroll}>
  <Ruler
    --ruler-box-shadow="var(--shadow-right)"
    visibleHours={getVisibleHours($settings)}
  />
  {#each $dateRange as day}
    <div class="day-column">
      <Timeline {day} isUnderCursor={true} />
    </div>
  {/each}
</Scroller>

<style>
  .header-row {
    display: flex;
  }

  .day-buttons {
    font-size: var(--font-ui-small);
  }

  .corner {
    position: sticky;
    z-index: 100;
    top: 0;
    left: 0;

    flex: 0 0 var(--time-ruler-width);

    background-color: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-top: none;
    border-left: none;
  }

  .day-column {
    display: flex;
    flex: 1 0 200px;
    flex-direction: column;

    background-color: var(--background-secondary);
    border-right: 1px solid var(--background-modifier-border);
  }

  .day-column:last-child {
    border-right: none;
  }

  .week-header {
    position: relative;
    z-index: 1000;

    overflow-x: hidden;
    display: flex;
    flex-direction: column;

    box-shadow: var(--shadow-bottom);
  }

  .header-cell {
    overflow-x: hidden;
    flex: 1 0 200px;

    background-color: var(--background-primary);
    border-right: 1px solid var(--background-modifier-border);
    border-bottom: 1px solid var(--background-modifier-border);
  }

  .header-cell:last-child {
    flex: 1 0 calc(200px + var(--scrollbar-width));
    border-right: none;
  }

  .today {
    color: white;
    background-color: var(--color-accent);
  }
</style>
