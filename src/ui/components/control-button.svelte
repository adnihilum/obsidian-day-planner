<script lang="ts">
  export let label: string | undefined = undefined;
  export let isActive = false;
  export let disabled = false;
  export let classes = "";
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="clickable-icon {classes}"
  class:is-active={isActive}
  aria-disabled={disabled}
  aria-label={label}
  on:click
>
  <slot />
</div>

<style>
  .clickable-icon {
    grid-column-start: var(--grid-column-start, auto);
    flex-basis: var(--flex-basis, var(--input-height));
    justify-content: var(--justify-content, center);

    place-self: var(--align-self, center) var(--justify-self, auto);

    color: var(--color, var(--icon-color));
    white-space: nowrap;

    border: var(--control-button-border, none);
  }
</style>
