import moment from "moment/moment";
import { TasksContainer } from "src/tasks-container";
import * as TC from "src/tasks-container";

export const dayKey = "2023-01-01";

export const day = moment(dayKey);

export const nextDayKey = "2023-01-02";

export const nextDay = moment(nextDayKey);

export const emptyTasks: TasksContainer = TC.fromArray([]); //TODO:  fix it later

export const baseTasks: TasksContainer = TC.fromArray([]);

export const unscheduledTask: TasksContainer = TC.fromArray([]);
