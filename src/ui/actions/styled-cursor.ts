export function styledCursor(el: HTMLElement, cursor: string) {
  // const initial = el.style.cursor;
  el.style.cursor = cursor;

  return {
    update(newCursor?: string) {
      //TODO: when enabled it generates freezes on cursor changes (Styles Recalculation)
      // el.style.cursor = newCursor || initial;
    },
    destroy() {
      // el.style.cursor = initial;
    },
  };
}
