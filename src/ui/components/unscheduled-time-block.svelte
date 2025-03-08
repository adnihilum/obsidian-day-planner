<script lang="ts">
  import { UnscheduledTask } from "../../types";

  import Grip from "./grip.svelte";
  import MarkdownBlockContent from "./markdown-block-content.svelte";
  import RenderedMarkdown from "./rendered-markdown.svelte";
  import TimeBlockBase from "./time-block-base.svelte";
  import TimeBlockPadding from "./time-block-padding.svelte";

  export let task: UnscheduledTask;
  export let onGripMouseDown: () => void;
</script>

<TimeBlockPadding>
  <TimeBlockBase {task} on:mouseup on:dblclick>
    <MarkdownBlockContent {task}>
      <RenderedMarkdown {task} />
      <Grip on:mousedown={onGripMouseDown} />
    </MarkdownBlockContent>
  </TimeBlockBase>
</TimeBlockPadding>
