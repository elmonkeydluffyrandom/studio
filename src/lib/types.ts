import { Timestamp } from "firebase/firestore";

export interface JournalEntry {
  id: string;
  bibleVerse: string;
  verseText: string;
  observation: string;
  teaching: string;
  practicalApplication: string;
  tagIds: string[];
  createdAt: Timestamp; 
}
