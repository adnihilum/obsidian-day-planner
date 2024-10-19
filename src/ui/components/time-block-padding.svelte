<script lang="ts">
</script>

<div class="padding">
  <slot />
</div>

<style>
  .padding {
    position: var(--time-block-position, static);
    top: var(--time-block-top, 0);
    left: var(--time-block-left, 0);

    display: flex;

    width: var(--time-block-width, 100%);
    height: var(--time-block-height, auto);
    padding: 0 1px 2px;

    transition: 0.05s linear;
  }

  /* TODO: Move out */
  .padding :global(svg.lock-icon) {
    width: var(--icon-xs);
    height: var(--icon-xs);
  }
</style>
