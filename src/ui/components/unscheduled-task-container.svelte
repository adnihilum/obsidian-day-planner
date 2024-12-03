<script lang="ts">
  import { pipe } from "fp-ts/lib/function";
  import * as M from "fp-ts/Map";
  import * as O from "fp-ts/Option";
  import * as Ord from "fp-ts/Ord";
  import * as S from "fp-ts/Set";
  import * as Str from "fp-ts/string";
  import { Moment } from "moment";
  import * as TC from "src/tasks-container";
  import * as SU from "src/util/storage/storageUtils";
  import { getDayKey } from "src/util/tasks-utils";
  import { getContext } from "svelte";
  import { derived, writable } from "svelte/store";

  import { obsidianContext } from "../../constants";
  import { settings } from "../../global-store/settings";
  import type { ObsidianContext, UnscheduledTask } from "../../types";

  import UnscheduledTimeBlock from "./unscheduled-time-block.svelte";

  export let day: Moment;

  const {
    editContext: { displayedTasks, editHandlers },
  } = getContext<ObsidianContext>(obsidianContext);
  const {
    cursor,
    handleTaskMouseUp,
    handleTaskDblClick,
    handleUnscheduledTaskGripMouseDown,
  } = editHandlers;

  const dayStoreW = writable(day);

  $: dayStoreW.set(day);

  const dayStore = SU.removeDups(TC.eqMoment)(dayStoreW, day);
  const displayedTasksWithNoTime = derived(
    [displayedTasks, dayStore],
    ([$displayedTasks, $day]) =>
      pipe(
        $displayedTasks.byDate,
        M.lookup(Str.Eq)(getDayKey($day)),
        O.getOrElse(() => new Set()),
        TC.withNoTime,
        S.toArray(
          Ord.contramap((t: UnscheduledTask) => t.displayedText)(Str.Ord),
        ),
      ),
  );
</script>

{#if $displayedTasksWithNoTime.length > 0 && $settings.showUncheduledTasks}
  <div class="unscheduled-task-container">
    {#each $displayedTasksWithNoTime as task}
      <UnscheduledTimeBlock
        gripCursor={$cursor.gripCursor}
        onGripMouseDown={() => handleUnscheduledTaskGripMouseDown(task)}
        {task}
        on:mouseup={() => handleTaskMouseUp(task)}
        on:dblclick={() => handleTaskDblClick(task)}
      />
    {/each}
  </div>
{/if}

<style>
  .unscheduled-task-container {
    overflow: auto;
    display: flex;
    flex-direction: column;

    max-height: 20vh;
    padding: var(--size-2-1) var(--size-4-1);
  }
</style>
