import assert from "assert";

import Fraction from "fraction.js";
import { partition } from "lodash/fp";

import type { Overlap, TimeBlock, Task } from "../types";
import { getEndMinutes, getIdAgnosticRenderKey } from "../util/task-utils";
import { zip } from "../util/zip";

import { getHorizontalPlacing } from "./horizontal-placing";

const empty = 0;
const taken = 1;

type Holes = Hole[];

interface Element {
  offset: number;
  size: number;
}

interface Hole {
  id: number;
  offset: number;
  size: number;
  elements: Element[];
}

interface HoleWithEnergy extends Hole {
  energy: number;
}

type HolesWithEnergy = HoleWithEnergy[];

function sortPredicateGen(
  aTime: number,
  aId: string,
  bTime: number,
  bId: string,
): number {
  const startTimeCompare = aTime - bTime;
  if (startTimeCompare == 0) {
    return aId > bId ? -1 : aId == bId ? 0 : 1;
  } else {
    return startTimeCompare;
  }
}

function sortPredicate(a: TimeBlock, b: TimeBlock): number {
  return sortPredicateGen(a.startMinutes, a.id, b.startMinutes, b.id);
}

function sortPredicateLongFirst(a: TimeBlock, b: TimeBlock): number {
  const startTimeCompare = a.startMinutes - b.startMinutes;
  if (startTimeCompare != 0) {
    return startTimeCompare;
  } else {
    const durationCompare = -(a.durationMinutes - b.durationMinutes);
    if (durationCompare != 0) {
      return durationCompare;
    } else {
      return a.id > b.id ? -1 : a.id == b.id ? 0 : 1;
    }
  }
}

function sortPredicatTimeBlockHalf(a: TimeBlockHalf, b: TimeBlockHalf): number {
  return sortPredicateGen(a.time, a.id, b.time, b.id);
}

export function computeOverlap(items: Array<TimeBlock>): Map<string, Overlap> {
  const overlapingTimeBlocks = calculateOverlappingItemsMap(items);

  const overlapLookup = new Map<string, Overlap>();

  items.forEach((item) => {
    const overlapGroup = Array.from(overlapingTimeBlocks.get(item)).sort(
      sortPredicateLongFirst,
    );
    computeOverlapForGroup(overlapGroup, overlapLookup);
  });

  return overlapLookup;
}

interface TimeBlockHalf {
  id: string;
  time: number;
  isStart: boolean;
  timeBlock: TimeBlock;
}

function setEvery<T>(s: Set<T>, f: (arg: T) => boolean): boolean {
  let result = true;
  s.forEach((el) => {
    result = result && f(el);
  });
  return result;
}

function appendIfOverlapsWithEverything(
  set: Set<TimeBlock>,
  el: TimeBlock,
): void {
  if (setEvery(set, (x) => overlaps(x, el))) {
    set.add(el);
  }
}

function calculateOverlappingItemsMap(
  items: Array<TimeBlock>,
): Map<TimeBlock, Set<TimeBlock>> {
  const allTimeBlockHalfs: Array<TimeBlockHalf> = items
    .flatMap((timeBlock) => [
      {
        id: timeBlock.id,
        time: timeBlock.startMinutes,
        isStart: true,
        timeBlock,
      },
      {
        id: timeBlock.id,
        time: getEndMinutes(timeBlock),
        isStart: false,
        timeBlock,
      },
    ])
    .sort(sortPredicatTimeBlockHalf);

  const overlapingTimeBlocks: Map<TimeBlock, Set<TimeBlock>> = new Map();

  allTimeBlockHalfs.reduce((currentStack, timeBlockHalf) => {
    if (timeBlockHalf.isStart) {
      // add ovelapping time blocks for current time block
      const currentOverlapingTimeBlocks = new Set<TimeBlock>([
        timeBlockHalf.timeBlock,
      ]);
      currentStack.forEach((x) =>
        appendIfOverlapsWithEverything(currentOverlapingTimeBlocks, x),
      );
      overlapingTimeBlocks.set(
        timeBlockHalf.timeBlock,
        currentOverlapingTimeBlocks,
      );

      // update overlapping time blocks for others
      currentStack.forEach((stackBlock) => {
        const stackOverlappingTimeBlocks = overlapingTimeBlocks.get(stackBlock);
        appendIfOverlapsWithEverything(
          stackOverlappingTimeBlocks,
          timeBlockHalf.timeBlock,
        );
      });
    }

    if (timeBlockHalf.isStart) {
      currentStack.add(timeBlockHalf.timeBlock);
    } else {
      currentStack.delete(timeBlockHalf.timeBlock);
    }

    return currentStack;
  }, new Set<TimeBlock>());

  return overlapingTimeBlocks;
}

function computeOverlapForGroup(
  overlapGroup: Array<TimeBlock>,
  lookup: Map<string, Overlap>,
): void {
  const [itemsPlacedPreviously, itemsToBePlaced] = partition(
    ({ id }) => lookup.has(id),
    overlapGroup,
  );

  if (itemsToBePlaced.length === 0) {
    return;
  }

  const fractionOfPlacedItems = itemsPlacedPreviously.reduce((sum, current) => {
    const { span, columns } = lookup.get(current.id);
    return new Fraction(span, columns).add(sum);
  }, new Fraction(0));

  const fractionForNewItems = new Fraction(1).sub(fractionOfPlacedItems);
  const fractionForEachNewItem = fractionForNewItems.div(
    itemsToBePlaced.length,
  );

  const maxPreviousPlaceColumns = itemsPlacedPreviously.reduce(
    (acc, current) => {
      const { columns } = lookup.get(current.id);
      return acc.gcd(new Fraction(1, columns));
    },
    new Fraction(1),
  );

  const columnsForNewGroup = fractionForEachNewItem.gcd(
    maxPreviousPlaceColumns,
  ).d;

  const newItemInherentSpan =
    fractionForEachNewItem.n * (columnsForNewGroup / fractionForEachNewItem.d);

  const slots = Array(columnsForNewGroup).fill(empty);

  itemsPlacedPreviously.forEach((item) => {
    const { start, span, columns: previousColumns } = lookup.get(item.id);

    const scale = columnsForNewGroup / previousColumns;
    const scaledStart = scale * start;
    const scaledSpan = scale * span;
    const scaledEnd = scaledStart + scaledSpan;
    slots.fill(taken, scaledStart, scaledEnd);
  });

  const initialHoles = findHoles(slots);

  const initializedHoles = initializeHoles(
    initialHoles,
    itemsToBePlaced.length,
  );

  const finalHoles =
    initializedHoles.length > 1
      ? iterateHoles(initializedHoles, newItemInherentSpan)
      : initializedHoles;

  const finalOverlaps = holesToOverlaps(finalHoles, columnsForNewGroup);

  zip(itemsToBePlaced, finalOverlaps).forEach(([itemInGroup, overlap]) => {
    lookup.set(itemInGroup.id, overlap);
  });

  return;
}

function findHoles<T>(slots: Array<T>): Holes {
  const holes: Holes = [];
  let holeIdx = 0;

  function insertHole(startIndex: number, endIndex: number): void {
    holes.push({
      id: holeIdx,
      offset: startIndex,
      size: endIndex - startIndex,
      elements: [],
    });
    holeIdx += 1;
  }

  const lastStartHoleOffset = slots.reduce(
    (prevStartHoleOffset, element, index) => {
      let result;

      if (element === empty && prevStartHoleOffset < 0) {
        result = index;
      } else if (element === taken) {
        if (prevStartHoleOffset >= 0) {
          insertHole(prevStartHoleOffset, index);
        }
        result = -1;
      } else {
        result = prevStartHoleOffset;
      }
      return result;
    },
    -1,
  );

  if (lastStartHoleOffset >= 0) {
    insertHole(lastStartHoleOffset, slots.length);
  }

  return holes;
}

function addElementsToHole<T extends Hole>(
  hole: T,
  numElementsToAdd: number,
): T {
  const newNumElements = hole.elements.length + numElementsToAdd;
  assert(newNumElements <= hole.size);

  const minElementSize = Math.floor(hole.size / newNumElements);
  const paddingNumber = hole.size % newNumElements;

  const elements: Element[] = [];

  Array(newNumElements)
    .fill(minElementSize)
    .map((x, idx) => (idx < paddingNumber ? x + 1 : x)) //add padding to the left ones first
    .reduce((currentOffset, elementSize) => {
      elements.push({
        offset: currentOffset,
        size: elementSize,
      });

      return currentOffset + elementSize;
    }, 0);

  return { ...hole, elements };
}

function initializeHoles(holes: Holes, numElements: number): Holes {
  const newHoles = Array.from(holes);

  Array.from(holes).reduce((currentElementsToPopulate, hole, holeIdx) => {
    if (currentElementsToPopulate > 0) {
      const elementsToAdd = Math.min(currentElementsToPopulate, hole.size);
      newHoles[holeIdx] = addElementsToHole(hole, elementsToAdd);
      return currentElementsToPopulate - elementsToAdd;
    } else {
      return currentElementsToPopulate;
    }
  }, numElements);
  return newHoles;
}

function calculateHoleEnergy(
  hole: Hole,
  prefferedSpan: number,
): HoleWithEnergy {
  if (hole.elements.length == 0) {
    return { ...hole, energy: -hole.size };
  } else {
    const energy = hole.elements
      .map((el) => -Math.abs(el.size - prefferedSpan))
      .reduce((acc, x) => acc + x, 0);
    return { ...hole, energy };
  }
}

function calculateHolesEnergy(
  holes: Holes,
  prefferedSpan: number,
): HolesWithEnergy {
  return Array.from(holes).map((hole, idx) =>
    calculateHoleEnergy(hole, prefferedSpan),
  );
}

function getTotalHolesEnergy(holes: HolesWithEnergy): number {
  return Array.from(holes.values()).reduce((a, b) => a + b.energy, 0);
}

function makeCandidateHole(
  oldHoles: HolesWithEnergy,
  donor: number,
  recipient: number,
  prefferedSpan: number,
): HolesWithEnergy {
  const nextHolesWithEnergy = Array.from(oldHoles);
  nextHolesWithEnergy[recipient] = calculateHoleEnergy(
    addElementsToHole(nextHolesWithEnergy[recipient], 1),
    prefferedSpan,
  );
  nextHolesWithEnergy[donor] = calculateHoleEnergy(
    addElementsToHole(nextHolesWithEnergy[donor], -1),
    prefferedSpan,
  );

  return nextHolesWithEnergy;
}

function iterateHolesOnce(
  oldHoles: HolesWithEnergy,
  prefferedSpan: number,
): HolesWithEnergy | undefined {
  const currentEnergy = getTotalHolesEnergy(oldHoles);

  const donors = Array.from(oldHoles.entries())
    .filter((x) => x[1].elements.length > 0)
    .map((x) => x[0]);
  const recipients = Array.from(oldHoles.entries())
    .filter((x) => x[1].elements.length < x[1].size)
    .map((x) => x[0]);

  const pairs = donors.flatMap((donor) => {
    return recipients
      .filter((x) => x != donor)
      .map((recipient) => [donor, recipient]);
  });

  const candidats = pairs.map(([donor, recipient]) => {
    const candidateHoles = makeCandidateHole(
      oldHoles,
      donor,
      recipient,
      prefferedSpan,
    );
    const candidateEnergy = getTotalHolesEnergy(candidateHoles);
    return { candidateHoles, candidateEnergy };
  });

  if (candidats.length == 0) {
    return;
  }

  const primeCandidate = candidats.reduce(
    (accCandidate, candidate) =>
      candidate.candidateEnergy > accCandidate.candidateEnergy
        ? candidate
        : accCandidate,
    candidats[0],
  );

  if (primeCandidate.candidateEnergy > currentEnergy) {
    return primeCandidate.candidateHoles;
  } else {
    return;
  }
}

function iterateHoles(initialHoles: Holes, prefferedSpan: number): Holes {
  if (initialHoles.length == 1) {
    return initialHoles;
  } else {
    let currentHoles = calculateHolesEnergy(initialHoles, prefferedSpan);
    let nextHoles = currentHoles;
    do {
      currentHoles = nextHoles;
      nextHoles = iterateHolesOnce(currentHoles, prefferedSpan);
    } while (nextHoles);
    return currentHoles;
  }
}

function holesToOverlaps(holes: Holes, columns: number): Overlap[] {
  return Array.from(holes).flatMap((hole) =>
    hole.elements.map((element) => ({
      columns,
      start: hole.offset + element.offset,
      span: element.size,
    })),
  );
}

function overlaps(a: TimeBlock, b: TimeBlock) {
  const [early, late] = a.startMinutes < b.startMinutes ? [a, b] : [b, a];

  return getEndMinutes(early) > late.startMinutes;
}

export function addHorizontalPlacing(tasks: Task[]) {
  if (tasks.length === 0) {
    return [];
  }

  const tasksForComputation = tasks
    .map((t) => ({ ...t, id: getIdAgnosticRenderKey(t) }))
    .sort(sortPredicate);

  const overlapLookup = computeOverlap(tasksForComputation);

  return tasks.map((task) => {
    const overlap = overlapLookup.get(getIdAgnosticRenderKey(task));

    return {
      ...task,
      placing: getHorizontalPlacing(overlap),
    };
  });
}
