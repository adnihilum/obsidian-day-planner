import { DayPlannerSettings } from "../settings";

export function getHourSize(settings: DayPlannerSettings) {
  return settings.zoomLevel * 60;
}

export function getHiddenHoursSize(settings: DayPlannerSettings) {
  return settings.startHour * getHourSize(settings);
}

export function getVisibleHours(settings: DayPlannerSettings) {
  return [...Array(24).keys()].slice(settings.startHour);
}

export function timeToTimelineOffset(
  minutes: number,
  settings: DayPlannerSettings,
) {
  return minutes * settings.zoomLevel - getHiddenHoursSize(settings);
}

export function snapMinutes(
  minutes: number,
  { zoomLevel, snapStepMinutes }: DayPlannerSettings,
) {
  return Math.round(minutes / snapStepMinutes) * snapStepMinutes;
}
