import { computeOverlap } from "./overlap";

test("simplest case", () => {
  expect(
    computeOverlap([
      { id: "1", startMinutes: 1, durationMinutes: 1 },
      { id: "2", startMinutes: 2, durationMinutes: 1 },
    ]),
  ).toEqual(
    new Map([
      ["1", { start: 0, span: 1, columns: 1 }],
      ["2", { start: 0, span: 1, columns: 1 }],
    ]),
  );
});

test("simple case", () => {
  expect(
    computeOverlap([
      { id: "1", startMinutes: 1, durationMinutes: 2 },
      { id: "2", startMinutes: 2, durationMinutes: 2 },
    ]),
  ).toEqual(
    new Map([
      ["1", { start: 0, span: 1, columns: 2 }],
      ["2", { start: 1, span: 1, columns: 2 }],
    ]),
  );
});

test("3 tasks overlapping with each other", () => {
  expect(
    computeOverlap([
      { id: "1", startMinutes: 1, durationMinutes: 3 },
      { id: "2", startMinutes: 2, durationMinutes: 2 },
      { id: "3", startMinutes: 3, durationMinutes: 1 },
    ]),
  ).toEqual(
    new Map([
      ["1", { start: 0, span: 1, columns: 3 }],
      ["2", { start: 1, span: 1, columns: 3 }],
      ["3", { start: 2, span: 1, columns: 3 }],
    ]),
  );
});

/*
┌──────┐
│      │
│      │
│      │ ┌──────┐
│      │ │      │
│      │ │      │
│      │ │      │
│      │ │      │
└──────┘ │      │
         │      │
┌──────┐ │      │
│      │ │      │
│      │ └──────┘
│      │
│      │
└──────┘
*/
test("3 tasks overlapping with next one, but not with each other", () => {
  expect(
    computeOverlap([
      { id: "1", startMinutes: 1, durationMinutes: 2 },
      { id: "2", startMinutes: 2, durationMinutes: 3 },
      { id: "3", startMinutes: 4, durationMinutes: 2 },
    ]),
  ).toEqual(
    new Map([
      ["1", { start: 0, span: 1, columns: 2 }],
      ["2", { start: 1, span: 1, columns: 2 }],
      ["3", { start: 0, span: 1, columns: 2 }],
    ]),
  );
});

/*
┌──────┐
│      │ ┌──────┐
│      │ │      │
│      │ └──────┘
│      │
│      │ ┌──────┐
└──────┘ │      │
         │      │
         └──────┘
*/
test("1st overlaps with 2nd and 3rd, but they don't overlap with each other", () => {
  expect(
    computeOverlap([
      { id: "1", startMinutes: 1, durationMinutes: 5 },
      { id: "2", startMinutes: 2, durationMinutes: 1 },
      { id: "3", startMinutes: 4, durationMinutes: 3 },
    ]),
  ).toEqual(
    new Map([
      ["1", { start: 0, span: 1, columns: 2 }],
      ["2", { start: 1, span: 1, columns: 2 }],
      ["3", { start: 1, span: 1, columns: 2 }],
    ]),
  );
});

/*
┌──────┐
│      │
│  1   │
│      │ ┌──────┐
│      │ │      │
│      │ │      │ ┌──────┐
│      │ │  2   │ │      │
│      │ │      │ │3     │
└──────┘ │      │ │      │
         │      │ │      │
         │      │ │      │
         │      │ │      │
         ├──────┤ │      │
┌────────┴──────┤ │      │
│     4         │ │      │
│               │ └──────┘
└───────────────┘
*/
test("2 groups: one with 3 items, other with 2. One item is in both groups (fractions get distributed)", () => {
  expect(
    computeOverlap([
      { id: "1", startMinutes: 1, durationMinutes: 3 },
      { id: "2", startMinutes: 2, durationMinutes: 3 },
      { id: "3", startMinutes: 3, durationMinutes: 5 },
      { id: "4", startMinutes: 7, durationMinutes: 2 },
    ]),
  ).toEqual(
    new Map([
      ["1", { start: 0, span: 1, columns: 3 }],
      ["2", { start: 1, span: 1, columns: 3 }],
      ["3", { start: 2, span: 1, columns: 3 }],
      ["4", { start: 0, span: 2, columns: 3 }],
    ]),
  );
});

/*
┌─────┐ ┌─────┐ ┌────┐
│     │ │     │ │    │
│     │ │  2  │ │    │
│ 1   │ │     │ │ 3  │
│     │ │     │ │    │
│     │ │     │ │    │
│     │ └─────┘ └────┘
│     │
│     │  ┌───────────┐
│     │  │    4      │
└─────┘  └───────────┘
 */
test("2 groups: one with 3 items, other with 2 with second after first", () => {
  expect(
    computeOverlap([
      { id: "1", startMinutes: 1, durationMinutes: 4 },
      { id: "2", startMinutes: 1, durationMinutes: 2 },
      { id: "3", startMinutes: 1, durationMinutes: 2 },
      { id: "4", startMinutes: 4, durationMinutes: 1 },
    ]),
  ).toEqual(
    new Map([
      ["1", { start: 0, span: 1, columns: 3 }],
      ["2", { start: 2, span: 1, columns: 3 }],
      ["3", { start: 1, span: 1, columns: 3 }],
      ["4", { start: 1, span: 2, columns: 3 }],
    ]),
  );
});

/*
┌──────┐  ┌───────────┐
│      │  │      2    │
│   1  │  └───────────┘
│      │
│      │ ┌─────┐
│      │ │  3  │
│      │ │     │ ┌────┐
│      │ │     │ │    │
└──────┘ │     │ │  4 │
         └─────┘ │    │
                 │    │
┌──────────────┐ │    │
│     5        │ │    │
│              │ └────┘
└──────────────┘
*/
test("combined case", () => {
  expect(
    computeOverlap([
      { id: "1", startMinutes: 1, durationMinutes: 7 },
      { id: "2", startMinutes: 2, durationMinutes: 1 },
      { id: "3", startMinutes: 4, durationMinutes: 4 },
      { id: "4", startMinutes: 5, durationMinutes: 5 },
      { id: "5", startMinutes: 9, durationMinutes: 2 },
    ]),
  ).toEqual(
    new Map([
      ["1", { start: 0, span: 1, columns: 2 }],
      ["2", { start: 1, span: 1, columns: 2 }],
      ["3", { start: 2, span: 1, columns: 4 }],
      ["4", { start: 3, span: 1, columns: 4 }],
      ["5", { start: 0, span: 3, columns: 4 }],
    ]),
  );
});

/*
┌─────┐
│     │
│     │ ┌─────┐
│     │ │     │
│  1  │ │     │ ┌─────┐
│     │ │  2  │ │     │
│     │ │     │ │     │
└─────┘ │     │ │   3 │
        │     │ │     │
        │     │ │     │
        ├┬─┬──┤ │     │
┌───┐ ┌─┴┤ ├──┤ │     │
│   │ │  │ │  │ │     │
│ 4 │ │ 5│ │6 │ │     │
│   │ │  │ │  │ │     │
│   │ │  │ │  │ │     │
└───┘ └──┘ └──┘ └─────┘
*/
test("more complex splitting of available space", () => {
  expect(
    computeOverlap([
      { id: "1", startMinutes: 1, durationMinutes: 5 },
      { id: "2", startMinutes: 2, durationMinutes: 4 },
      { id: "3", startMinutes: 3, durationMinutes: 6 },
      { id: "4", startMinutes: 7, durationMinutes: 2 },
      { id: "5", startMinutes: 7, durationMinutes: 2 },
      { id: "6", startMinutes: 7, durationMinutes: 2 },
    ]),
  ).toEqual(
    new Map([
      ["1", { start: 0, columns: 3, span: 1 }],
      ["2", { start: 1, columns: 3, span: 1 }],
      ["3", { start: 2, columns: 3, span: 1 }],
      ["4", { start: 4, columns: 9, span: 2 }],
      ["5", { start: 2, columns: 9, span: 2 }],
      ["6", { start: 0, columns: 9, span: 2 }],
    ]),
  );
});

/*
┌────┐
│ 1  │  ┌────┐
│    │  │  2 │ ┌3────┐
└────┘  │    │ └─────┘
        │    │
┌─────┐ │    │
│  4  │ │    │
└─────┘ └────┘
 */
test("stops at first occupied slot from previous group", () => {
  expect(
    computeOverlap([
      { id: "1", startMinutes: 1, durationMinutes: 3 },
      { id: "2", startMinutes: 2, durationMinutes: 4 },
      { id: "3", startMinutes: 3, durationMinutes: 1 },
      { id: "4", startMinutes: 5, durationMinutes: 1 },
    ]),
  ).toEqual(
    new Map([
      ["1", { start: 0, columns: 3, span: 1 }],
      ["2", { start: 1, columns: 3, span: 1 }],
      ["3", { start: 2, columns: 3, span: 1 }],
      ["4", { start: 0, columns: 3, span: 1 }],
    ]),
  );
});

// - [ ] 08:00 - 09:30 1
// - [ ] 08:15 - 09:15 2
// - [ ] 08:30 - 08:45 3
// - [ ] 08:30 - 09:00 4
// - [ ] 08:45 - 09:30 5
// - [ ] 09:15 - 10:15 6

test("simple case of a hole in the middle", () => {
  expect(
    computeOverlap([
      { id: "1", startMinutes: 0, durationMinutes: 6 },
      { id: "2", startMinutes: 1, durationMinutes: 4 },
      { id: "3", startMinutes: 2, durationMinutes: 1 },
      { id: "4", startMinutes: 2, durationMinutes: 2 },
      { id: "5", startMinutes: 3, durationMinutes: 3 },
      { id: "6", startMinutes: 5, durationMinutes: 4 },
    ]),
  ).toEqual(
    new Map([
      ["1", { start: 0, columns: 4, span: 1 }],
      ["2", { start: 1, columns: 4, span: 1 }],
      ["3", { start: 3, columns: 4, span: 1 }],
      ["4", { start: 2, columns: 4, span: 1 }],
      ["5", { start: 3, columns: 4, span: 1 }],
      ["6", { start: 1, columns: 4, span: 2 }],
    ]),
  );
});

// - [ ] 15:00 - 15:45 1
// - [ ] 15:00 - 15:45 2
// - [ ] 15:00 - 16:30 3
// - [ ] 15:30 - 16:00 4
// - [ ] 15:45 - 16:15 5
// - [ ] 15:45 - 16:15 6
// - [ ] 15:45 - 16:15 7
// - [ ] 16:00 - 16:15 8

test("should correctly calculate start offset", () => {
  expect(
    computeOverlap([
      { id: "1", startMinutes: 0, durationMinutes: 3 },
      { id: "2", startMinutes: 0, durationMinutes: 3 },
      { id: "3", startMinutes: 0, durationMinutes: 6 },
      { id: "4", startMinutes: 2, durationMinutes: 2 },
      { id: "5", startMinutes: 3, durationMinutes: 2 },
      { id: "6", startMinutes: 3, durationMinutes: 2 },
      { id: "7", startMinutes: 3, durationMinutes: 2 },
      { id: "8", startMinutes: 4, durationMinutes: 1 },
    ]),
  ).toEqual(
    new Map([
      ["1", { start: 2, columns: 4, span: 1 }],
      ["2", { start: 1, columns: 4, span: 1 }],
      ["3", { start: 0, columns: 4, span: 1 }],
      ["4", { start: 3, columns: 4, span: 1 }],
      ["5", { start: 7, columns: 12, span: 2 }],
      ["6", { start: 5, columns: 12, span: 2 }],
      ["7", { start: 3, columns: 12, span: 2 }],
      ["8", { start: 9, columns: 12, span: 3 }],
    ]),
  );
});

// - [ ] 15:00 - 15:45 1
// - [ ] 15:15 - 16:45 2
// - [ ] 15:45 - 16:30 3
// - [ ] 16:00 - 16:15 4
// - [ ] 16:15 - 16:30 5
// - [ ] 16:15 - 16:45 6
// - [ ] 16:15 - 16:45 7
// - [ ] 16:30 - 16:45 8 << target
// - [ ] 16:30 - 16:45 9 << target
// - [ ] 16:30 - 16:45 10 << target

test("should fill all available holes properly", () => {
  expect(
    computeOverlap([
      { id: "1", startMinutes: 0, durationMinutes: 3 },
      { id: "2", startMinutes: 1, durationMinutes: 6 },
      { id: "3", startMinutes: 3, durationMinutes: 3 },
      { id: "4", startMinutes: 4, durationMinutes: 1 },
      { id: "5", startMinutes: 5, durationMinutes: 1 },
      { id: "6", startMinutes: 5, durationMinutes: 2 },
      { id: "7", startMinutes: 5, durationMinutes: 2 },
      { id: "8", startMinutes: 6, durationMinutes: 1 },
      { id: "9", startMinutes: 6, durationMinutes: 1 },
      { id: "A", startMinutes: 6, durationMinutes: 1 },
    ]),
  ).toEqual(
    new Map([
      ["1", { start: 0, columns: 2, span: 1 }],
      ["2", { start: 1, columns: 2, span: 1 }],
      ["3", { start: 0, columns: 4, span: 1 }],
      ["4", { start: 1, columns: 4, span: 1 }],
      ["5", { start: 5, columns: 12, span: 1 }],
      ["6", { start: 4, columns: 12, span: 1 }],
      ["7", { start: 3, columns: 12, span: 1 }],
      ["8", { start: 15, columns: 36, span: 3 }],
      ["9", { start: 5, columns: 36, span: 4 }],
      ["A", { start: 0, columns: 36, span: 5 }],
    ]),
  );
});
