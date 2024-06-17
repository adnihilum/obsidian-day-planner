<script lang="ts">
  import { GripVertical } from "lucide-svelte";

  export let cursor: string;
</script>

<div style:cursor class="grip" on:mousedown|stopPropagation>
  <GripVertical class="svg-icon" />
</div>

<style>
  .grip {
    position: absolute;
    z-index: 10;
    right: 0;

    grid-column: 2;
    align-self: flex-start;

    color: var(--text-faint);

    opacity: 0;
  }

  .grip:hover {
    color: var(--text-muted);
    opacity: 1;
  }
</style>
