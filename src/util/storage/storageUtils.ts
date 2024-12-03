import * as Eq from "fp-ts/Eq";
import * as O from "fp-ts/Option";
import { derived, get, Readable, Writable, writable } from "svelte/store";

declare type Stores =
  | Readable<any> // eslint-disable-line @typescript-eslint/no-explicit-any
  | [Readable<any>, ...Array<Readable<any>>] // eslint-disable-line @typescript-eslint/no-explicit-any
  | Array<Readable<any>>; // eslint-disable-line @typescript-eslint/no-explicit-any

declare type StoresValues<T> =
  T extends Readable<infer U>
    ? U
    : {
        [K in keyof T]: T[K] extends Readable<infer U> ? U : never;
      };

export function asyncDerivedStream<S extends Stores, T>(
  stores: S,
  callback: (values: StoresValues<S>) => Promise<T>,
  initial_value?: T,
): Readable<T> {
  let previous = 0;

  return derived(
    stores,
    ($stores, set) => {
      const start = Date.now();
      Promise.resolve(callback($stores)).then((value) => {
        if (start > previous) {
          previous = start;
          set(value);
        }
      });
    },
    initial_value,
  );
}

export function foldMapAsync<Input, Output, State>(
  baseStore: Readable<Input>,
  callback: (
    stateValue: State,
    nextValue: Input,
  ) => Promise<{ new_state: State; result: Output }>,
  initial_value: State,
): Readable<Output> {
  const internalState: Writable<State> = writable(initial_value);
  return asyncDerivedStream(baseStore, async (value) => {
    const stateValue = get(internalState);
    const newValue = await callback(stateValue, value); //TODO: error handling;
    internalState.set(newValue.new_state);
    return newValue.result;
  });
}

export function filter<T>(
  predicate: (value: T) => boolean,
  initialValue?: T,
): (baseStore: Readable<T>) => Readable<T> {
  return (baseStore: Readable<T>) => {
    const resultStore: Writable<T> = writable(initialValue);

    baseStore.subscribe((value: T) => {
      if (predicate(value)) resultStore.set(value);
    });

    return resultStore;
  };
}

export function unNone<T>(
  baseStore: Readable<O.Option<T>>,
  initialValue?: T,
): Readable<T> {
  const resultStore: Writable<T> = writable(initialValue);
  baseStore.subscribe(O.map((v: T) => resultStore.set(v)));
  return resultStore;
}

export function foldMap<Input, Output, State>(
  baseStore: Readable<Input>,
  callback: (
    stateValue: State,
    nextValue: Input,
  ) => { new_state: State; result: Output },
  initial_value: State,
): Readable<Output> {
  const internalState: Writable<State> = writable(initial_value);
  return derived(baseStore, (value) => {
    const stateValue = get(internalState);
    const newValue = callback(stateValue, value); //TODO: error handling;
    internalState.set(newValue.new_state);
    return newValue.result;
  });
}

export function removeDups<T>(
  eq: Eq.Eq<T>,
): (baseStore: Readable<T>, initial_value?: T) => Readable<T> {
  return (baseStore: Readable<T>, initial_value?: T) => {
    const resultStore: Writable<T> = writable(initial_value);
    let prevValue: T = initial_value;

    baseStore.subscribe((value) => {
      if (!eq.equals(value, prevValue)) {
        resultStore.set(value);
        prevValue = value;
      }
    });

    return resultStore;
  };
}

export interface OnlyWritable<T> {
  /**
   * Set value and inform subscribers.
   * @param value to set
   */
  set(this: void, value: T): void;
}
