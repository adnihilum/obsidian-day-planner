<script lang="ts">
  import { Writable } from "svelte/store";

  export let pointerOffsetY: Writable<number>;

  let el: HTMLDivElement;

  function updatePointerOffsetY(event: MouseEvent) {
    const viewportToElOffsetY = el.getBoundingClientRect().top;
    const borderTopToPointerOffsetY = event.clientY - viewportToElOffsetY;
    pointerOffsetY.set(borderTopToPointerOffsetY);
  }
</script>

<div
  bind:this={el}
  class="tasks absolute-stretch-x"
  on:mousedown
  on:mouseenter
  on:mousemove={updatePointerOffsetY}
  on:mouseup|stopPropagation
  on:dblclick
>
  <slot />
</div>

<style>
  .tasks {
    top: 0;
    bottom: 0;

    display: flex;
    flex-direction: column;

    margin-right: 2px;
    margin-left: 2px;
  }
</style>
