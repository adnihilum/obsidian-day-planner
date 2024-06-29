import type { Moment } from "moment";
import type { CachedMetadata } from "obsidian";
import { dedent } from "ts-dedent";

import {
  keylessScheduledPropRegExp,
  scheduledPropRegExp,
  shortScheduledPropRegExp,
  timestampRegExp,
} from "../regexp";
import type { TaskLocation } from "../types";
import { getId } from "../util/id";

import { parseTimestamp } from "./timestamp/timestamp";

export function getListItemsUnderHeading(
  metadata: CachedMetadata,
  heading: string,
) {
  const { headings } = metadata;

  if (!headings) {
    return [];
  }

  const planHeadingIndex = headings.findIndex((h) => h.heading === heading);

  if (planHeadingIndex < 0) {
    return [];
  }

  const planHeading = headings[planHeadingIndex];
  const nextHeadingOfSameLevel = headings
    .slice(planHeadingIndex + 1)
    .find((heading) => heading.level <= planHeading.level);

  return metadata.listItems?.filter((li) => {
    const isBelowPlan =
      li.position.start.line > planHeading.position.start.line;
    const isAboveNextHeadingIfItExists =
      !nextHeadingOfSameLevel ||
      li.position.start.line < nextHeadingOfSameLevel.position.start.line;

    return isBelowPlan && isAboveNextHeadingIfItExists;
  });
}

export function getHeadingByText(metadata: CachedMetadata, text: string) {
  const { headings = [] } = metadata;

  return headings?.find((h) => h.heading === text);
}

export function createTask({
  line,
  completeContent,
  location,
  day,
}: {
  line: string;
  completeContent: string;
  location: TaskLocation;
  day: Moment;
}) {
  const match = timestampRegExp.exec(line.trim());

  if (!match) {
    return null;
  }

  const {
    groups: { listTokens, start, end, text },
  } = match;

  const startTime = parseTimestamp(start, day);

  return {
    listTokens,
    startTime,
    endTime: parseTimestamp(end, day),
    text: getDisplayedText(match, completeContent),
    firstLineText: text.trim(),
    location,
    id: getId(),
  };
}

function getDisplayedText(
  { groups: { text, completion } }: RegExpExecArray,
  completeContent: string,
) {
  const isTask = completion?.length > 0;

  const indexOfFirstNewline = completeContent.indexOf("\n");
  const indexAfterFirstNewline = indexOfFirstNewline + 1;
  const linesAfterFirst = completeContent.substring(indexAfterFirstNewline);

  const cleanText = text
    .replace(shortScheduledPropRegExp, "")
    .replace(scheduledPropRegExp, "")
    .replace(keylessScheduledPropRegExp, "")
    .trim();

  if (indexOfFirstNewline < 0) {
    return cleanText;
  } else {
    if (isTask) {
      return `${cleanText}\n${linesAfterFirst}`;
    } else {
      const formattedLinesAfterFirst = dedent(linesAfterFirst).trimStart();
      return `${cleanText}\n${formattedLinesAfterFirst}`;
    }
  }
}
