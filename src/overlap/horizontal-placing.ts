import type { HorizontalPlacing, Overlap } from "../types";

export function getHorizontalPlacing(overlap?: Overlap): HorizontalPlacing {
  const widthPercent = overlap ? (overlap.span / overlap.columns) * 100 : 100;
  const xOffsetPercent = overlap ? (100 / overlap.columns) * overlap.start : 0;

  return {
    widthPercent,
    xOffsetPercent,
  };
}
