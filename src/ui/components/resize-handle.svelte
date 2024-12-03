<script lang="ts">
  export let visible = true;
  $: cssVarStyles = visible
    ? `--resize-handle-hover-color:var(--divider-color-hover)`
    : `--resize-handle-hover-color:transparent`;
</script>

<hr
  style={cssVarStyles}
  class="workspace-leaf-resize-handle"
  on:mousedown|stopPropagation
/>

<style>
  :not(#dummy).workspace-leaf-resize-handle {
    cursor: row-resize;
    display: block;
    right: 0;
    bottom: 0;
    left: 0;

    height: calc(var(--divider-width-hover) * 2);

    border-bottom-width: var(--divider-width);
    background-color: transparent;
  }

  :not(#dummy).workspace-leaf-resize-handle:hover {
    background-color: var(--resize-handle-hover-color);
  }
</style>
