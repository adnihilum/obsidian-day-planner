<script lang="ts">
  import { GripVertical } from "lucide-svelte";
</script>

<div class="clickable-icon" on:mousedown|stopPropagation>
  <GripVertical class="svg-icon" />
</div>

<style>
  .clickable-icon {
    position: absolute;
    z-index: 10;
    right: 0;

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
