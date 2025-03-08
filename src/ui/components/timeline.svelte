<script lang="ts">
  import { pipe } from "fp-ts/lib/function";
  import * as Ord from "fp-ts/lib/Ord";
  import * as S from "fp-ts/lib/Set";
  import * as Str from "fp-ts/lib/string";
  import { Moment } from "moment";
  import * as TC from "src/tasks-container";
  import * as SU from "src/util/storage/storageUtils";
  import { getContext } from "svelte";
  import { derived, get, writable, Writable } from "svelte/store";

  import { dateRangeContextKey, obsidianContext } from "../../constants";
  import { getVisibleHours } from "../../global-store/derived-settings";
  import { settings } from "../../global-store/settings";
  import { ObsidianContext } from "../../types";
  import { isToday } from "../../util/moment";
  import { getRenderKey } from "../../util/task-utils";

  import Column from "./column.svelte";
  import LocalTimeBlock from "./local-time-block.svelte";
  import Needle from "./needle.svelte";
  import RemoteTimeBlock from "./remote-time-block.svelte";
  import ScheduledTaskContainer from "./scheduled-task-container.svelte";

  // TODO: showRuler or add <slot name="left-gutter" />
  export let day: Moment;
  export let isUnderCursor = false;

  const dayStore: Writable<Moment> = writable(day);

  const {
    editContext: { confirmEdit, editOperation, editHandlers },
  } = getContext<ObsidianContext>(obsidianContext);
  const dateRange = getContext<Writable<Moment[]>>(dateRangeContextKey);
  const {
    getDisplayedTasks,
    cancelEdit,
    handleContainerDblClick,
    handleResizerMouseDown,
    handleTaskMouseUp,
    handleTaskDblClick,
    handleGripMouseDown,
    handleCopyMouseDown,
    handleMouseEnter,
    pointerOffsetY,
  } = editHandlers;

  $: dayStore.set(day);

  const actualDay = pipe(
    derived(
      [dateRange, dayStore],
      ([$dateRange, $day]) => $day || $dateRange[0],
    ),
    SU.removeDups(TC.eqMoment),
  ); //TODO:  dateRange doesn't change

  actualDay.subscribe(
    ($actualDay) =>
      `actualDay = ${$actualDay}, day = ${get(dayStore)}, $dateRange[0] = ${get(dateRange)[0]}`,
  );

  const displayedTasksWithTime = derived(
    getDisplayedTasks(actualDay),
    ($displayedTasks) =>
      S.toArray(Ord.contramap(getRenderKey)(Str.Ord))(
        TC.withTime($displayedTasks.allTasksSet()),
      ),
  );
</script>

<svelte:window on:blur={cancelEdit} />
<svelte:body />
<svelte:document on:mouseup={cancelEdit} />

<Column visibleHours={getVisibleHours($settings)}>
  {#if isToday($actualDay)}
    <Needle autoScrollBlocked={isUnderCursor} />
  {/if}

  <ScheduledTaskContainer
    {pointerOffsetY}
    on:dblclick={handleContainerDblClick}
    on:mouseenter={() => handleMouseEnter($actualDay)}
    on:mouseup={confirmEdit}
  >
    {#each $displayedTasksWithTime as task (getRenderKey(task))}
      {#if task.calendar}
        <RemoteTimeBlock {task} />
      {:else}
        <LocalTimeBlock
          isResizeHandleVisible={!$editOperation}
          onCopyMouseDown={() => handleCopyMouseDown(task)}
          onGripMouseDown={() => handleGripMouseDown(task)}
          onResizerMouseDown={() => handleResizerMouseDown(task)}
          {task}
          on:mouseup={() => handleTaskMouseUp(task)}
          on:dblclick={(e) => {
            handleTaskDblClick(task);
            e.stopPropagation();
          }}
        />
      {/if}
    {/each}
  </ScheduledTaskContainer>
</Column>
