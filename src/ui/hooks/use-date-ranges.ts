import { omit } from "lodash/fp";
import { Moment } from "moment";
import { Subscriber, Updater, Writable, writable } from "svelte/store";

import { getId } from "../../util/id";

export function useDateRanges() {
  const ranges: Writable<Record<string, Moment[]>> = writable({});

  function trackRange(range: Moment[]) {
    const rangeKey = getId();

    ranges.update((previous) => ({ ...previous, [rangeKey]: range }));
    ranges.subscribe((rs) =>
      console.log(`ranges: \n${JSON.stringify(rs, null, 2)}`),
    );

    function untrack() {
      ranges.update(omit([rangeKey]));
    }

    function update(fn: Updater<Moment[]>) {
      ranges.update((previous) => ({
        ...previous,
        [rangeKey]: fn(previous[rangeKey]),
      }));
    }

    function set(value: Moment[]) {
      ranges.update((previous) => ({
        ...previous,
        [rangeKey]: value,
      }));
    }

    function subscribe(fn: Subscriber<Moment[]>) {
      return ranges.subscribe((next) => fn(next[rangeKey]));
    }

    return {
      subscribe,
      update,
      set,
      untrack,
    };
  }

  return {
    trackRange,
    ranges,
  };
}
