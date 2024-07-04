<script lang="ts">
  import { UnscheduledTask } from "../../types";

  import MarkdownBlockContent from "./markdown-block-content.svelte";
  import RenderedMarkdown from "./rendered-markdown.svelte";
  import TimeBlockBase from "./time-block-base.svelte";

  export let task: UnscheduledTask;
</script>

<div class="content">
  <TimeBlockBase {task} on:mouseup on:dblclick textWrap={false}>
    <!-- padding should be set to zero here -->
    <MarkdownBlockContent {task}>
      <RenderedMarkdown {task} />
    </MarkdownBlockContent>
  </TimeBlockBase>
</div>

<style>
  .content {
    display: flex;
    width: 200px;
    align-self: stretch;
  }
</style>
