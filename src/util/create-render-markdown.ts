import { App, Component, MarkdownRenderer } from "obsidian";

export const createRenderMarkdown =
  (app: App) => (el: HTMLElement, markdown: string) => {
    const loader = new Component();

    el.empty();

    const newElement = document.createElement("div");

    // postpone markdown rendering, and attach it's result whenever its ready
    Promise.resolve(1)
      .then(() =>
        MarkdownRenderer.render(app, markdown, newElement, "", loader),
      )
      .then(() => el.appendChild(newElement));

    loader.load();

    return () => loader.unload();
  };
