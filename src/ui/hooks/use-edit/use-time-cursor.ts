import { Moment } from "moment";
import { Readable, derived, get, writable } from "svelte/store";

export interface TimeCursor {
  day: Moment;
  minutes: number;
}

export interface TimeCursorHistory {
  current: TimeCursor | undefined;
  previous: TimeCursor | undefined;
}

export interface TimeCursors {
  timeCursor: Readable<TimeCursor>;
  timeCursorHistory: Readable<TimeCursorHistory>;
}

export function useTimeCursors(
  day: Readable<Moment>,
  cursorMinutes: Readable<number>,
): TimeCursors {
  const timeCursor = derived([day, cursorMinutes], ([$day, $cursorMinutes]) => {
    return { day: $day, minutes: $cursorMinutes };
  });

  const timeCursorHistory = writable<TimeCursorHistory>({
    current: undefined,
    previous: undefined,
  });

  timeCursor.subscribe(($timeCursor) => {
    const curTimeCursorHistory = get(timeCursorHistory);
    timeCursorHistory.set({
      current: $timeCursor,
      previous: curTimeCursorHistory.current,
    });
  });

  return {
    timeCursor,
    timeCursorHistory,
  };
}
