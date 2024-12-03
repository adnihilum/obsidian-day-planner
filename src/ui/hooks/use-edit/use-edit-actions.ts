import { get, Writable } from "svelte/store";

import { TimelineKeeper } from "./timeline-keeper";
import { EditOperation } from "./types";

export function useEditActions(
  editOperation: Writable<EditOperation>,
  timelineKeeper: TimelineKeeper,
) {
  function startEdit(operation: EditOperation) {
    editOperation.set(operation);
  }

  function cancelEdit() {
    editOperation.set(undefined);
    timelineKeeper.cancelEdit();
  }

  async function confirmEdit() {
    if (get(editOperation) === undefined) {
      return;
    }

    timelineKeeper.confirmEdit();
    editOperation.set(undefined);
  }

  return { startEdit, cancelEdit, confirmEdit };
}
