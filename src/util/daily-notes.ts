import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as Rec from "fp-ts/Record";
import type { Moment } from "moment";
import type { TFile } from "obsidian";
import {
  createDailyNote,
  getAllDailyNotes,
  getDailyNote,
} from "obsidian-daily-notes-interface";

export async function createDailyNoteIfNeeded(moment: Moment): Promise<TFile> {
  return getDailyNote(moment, getAllDailyNotes()) || createDailyNote(moment);
}

export function getDailyNoteOption(moment: Moment): O.Option<TFile> {
  return O.fromNullable(getDailyNote(moment, getAllDailyNotes()));
}

export function fileIsADailyNode(path: string): boolean {
  return pipe(
    getAllDailyNotes(),
    Rec.toArray,
    A.map(([_, x]) => x.path),
    A.findFirst((curPath) => path == curPath),
    O.isSome,
  );
}
