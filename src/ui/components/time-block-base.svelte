<script lang="ts">
  import { UnscheduledTask } from "../../types";
  import { useColorOverride } from "../hooks/use-color-override";

  export let task: UnscheduledTask;
  export let textWrap: boolean = true;

  $: override = useColorOverride(task);
  // todo: hide in hook
  $: backgroundColor =
    $override || "var(--time-block-bg-color, var(--background-primary))";

  $: whiteSpace = textWrap ? "normal" : "nowrap"; //TODO: move to a variable
</script>

<div
  style:background-color={backgroundColor}
  style:white-space={whiteSpace}
  class="content"
  on:mousedown={(event) => event.stopPropagation()}
  on:mouseup
  on:dblclick
>
  <slot />
</div>

<style>
  .content {
    position: relative;

    overflow: hidden;
    display: flex;
    flex: 1 0 0;

    font-size: var(--font-ui-small);
    text-align: left;
    overflow-wrap: anywhere;

    border: 1px solid var(--time-block-border-color, var(--color-base-50));
    border-radius: var(--radius-s);
    box-shadow: 1px 1px 2px 0 #0000001f;
  }
</style>
