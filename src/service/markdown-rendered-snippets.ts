import moment, { Moment } from "moment";
import { App, Component, MarkdownRenderer } from "obsidian";

export interface MarkdownSnippet {
  element: HTMLElement;
  destroy: () => void;
}

export interface BorrowedMarkdownSnippet {
  markdown: string;
  isBorrowed: boolean;
  lastBorrowed: Moment;
  snippet: MarkdownSnippet;
}

//TODO:  add GC
export class MarkdownRenderedSnippets {
  private snippets: Map<string, BorrowedMarkdownSnippet[]>;

  constructor(readonly app: App) {
    this.snippets = new Map();
  }

  public async borrowSnippet(markdown: string): Promise<MarkdownSnippet> {
    const storedSnipets = this.snippets.get(markdown);
    if (storedSnipets) {
      const freeSnipet = storedSnipets.find((x) => !x.isBorrowed);
      if (freeSnipet) {
        const returnSnippet: MarkdownSnippet = {
          element: freeSnipet.snippet.element,
          destroy: () => this.returnSnippet(freeSnipet),
        };
        freeSnipet.isBorrowed = true;
        freeSnipet.lastBorrowed = moment();
        return Promise.resolve(returnSnippet);
      }
    }

    const snippet = this.renderMarkdown(markdown).then((s) => {
      const oldBorrowedSnipets = this.snippets.get(markdown) || [];
      const borrowedSnipet: BorrowedMarkdownSnippet = {
        markdown,
        isBorrowed: true,
        lastBorrowed: moment(),
        snippet: s,
      };
      this.snippets.set(markdown, [...oldBorrowedSnipets, borrowedSnipet]);
      return { ...s, destroy: () => this.returnSnippet(borrowedSnipet) };
    });

    return snippet;
  }

  public returnSnippet(snippet: BorrowedMarkdownSnippet): void {
    snippet.isBorrowed = false;
  }

  public clearStorage(): void {
    this.snippets.clear();
  }

  public deleteOldElements(): void {
    // remove old elements, that hadn't been accessed for 2 days
    const momentCutoff = moment().subtract(2, "d");
    for (const key of this.snippets.keys()) {
      const curSnippets = this.snippets.get(key);
      const newSnippets = curSnippets.filter((s) =>
        s.lastBorrowed.isAfter(momentCutoff),
      );
      this.snippets.set(key, newSnippets);
    }
  }

  public async runGCInBackground(interval: number): Promise<void> {
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    (async () => {
      for (;;) {
        try {
          await this.deleteOldElements();
        } catch (error) {
          console.error(error);
        }
        await delay(interval);
      }
    })();
  }

  private async renderMarkdown(markdown: string): Promise<MarkdownSnippet> {
    const loader = new Component();
    const element = document.createElement("div");

    // postpone markdown rendering, and attach it's result whenever its ready
    const app = this.app;
    Promise.resolve(1).then(() =>
      MarkdownRenderer.render(app, markdown, element, "", loader),
    );

    loader.load();

    return {
      element,
      destroy: () => loader.unload(),
    };
  }
}
