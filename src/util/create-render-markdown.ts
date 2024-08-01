import { MarkdownRenderedSnippets } from "../service/markdown-rendered-snippets";

export const createRenderMarkdown =
  (markdownRenderedSnippets: MarkdownRenderedSnippets) =>
  (el: HTMLElement, markdown: string) => {
    el.empty();

    const snippet = markdownRenderedSnippets.borrowSnippet(markdown);
    snippet.then((s) => el.appendChild(s.element));

    return () =>
      snippet.then((s) => {
        s.element.detach();
        s.destroy();
      });
  };
