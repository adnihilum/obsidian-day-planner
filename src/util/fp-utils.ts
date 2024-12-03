import { Eq } from "fp-ts/lib/Eq";

export function eqSimpleInstance<T>(): Eq<T> {
  return {
    equals(x: T, y: T): boolean {
      return x == y;
    },
  };
}
