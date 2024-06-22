<script lang="ts">
  import { Scissors } from "lucide-svelte";

  export let cursor: string;
</script>

<div style:cursor class="clickable-icon" on:mousedown|stopPropagation>
  <Scissors class="svg-icon" />
</div>

<style>
  .clickable-icon {
    position: absolute;
    z-index: 10;
    left: 0;

    grid-column: 2;
    align-self: flex-start;

    color: var(--text-faint);
    background-color: var(--time-block-bg-color);
    transition: 0s;

    opacity: 0;
  }

  .clickable-icon:hover {
    color: var(--text-muted);
    opacity: 1;
  }
</style>
