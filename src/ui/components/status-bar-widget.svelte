<script lang="ts">
  import { Readable } from "svelte/store";

  import { settings } from "../../global-store/settings";
  import { TasksForDay } from "../../types";
  import { useStatusBarWidget } from "../hooks/use-status-bar-widget";
  import StatusbarTimeBlock from "./statusbar-time-block.svelte";

  export let onClick: () => Promise<void>;
  export let tasksForToday: Readable<TasksForDay>;
  export let errorStore: Readable<Error>;

  const statusBarProps = useStatusBarWidget({ tasksForToday });

  $: ({ showNow, showNext, progressIndicator } = $settings);
  $: ({ current, next } = $statusBarProps);
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="root" on:click={onClick}>
  {#if $errorStore}
    😵 Error in Day Planner (click to see)
  {:else if !current && !next}
    <span class="status-bar-item-segment">All done</span>
  {:else}
    {#if showNow && current}
      <StatusbarTimeBlock task={current.task} />
      <span class="status-bar-item-segment">-{current.timeLeft}</span>
      {#if progressIndicator === "pie"}
        <div
          class="status-bar-item-segment progress-pie day-planner"
          data-value={current.percentageComplete}
        ></div>
      {:else if progressIndicator === "bar"}
        <div class="status-bar-item-segment day-planner-progress-bar">
          <div
            style="width: {current.percentageComplete}%;"
            class="day-planner-progress-value"
          ></div>
        </div>
      {/if}
    {/if}
    {#if showNext && next}
      <span class="status-bar-item-segment">
        in {next.timeToNext}
      </span>
      <StatusbarTimeBlock task={next.task} />
    {/if}
  {/if}
</div>

<style>
  .root {
    display: contents;
  }
</style>
