<script lang="ts">
  import { getContext } from "svelte";

  import { obsidianContext } from "../../constants";
  import type { ObsidianContext } from "../../types";

  const {
    editContext: { cancelEdit },
  } = getContext<ObsidianContext>(obsidianContext);
</script>

<!--TODO: this should be attached only once for all views-->
<svelte:window on:blur={cancelEdit} />
<svelte:body />
<svelte:document on:mouseup={cancelEdit} />
