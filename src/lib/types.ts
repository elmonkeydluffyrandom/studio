import { Timestamp } from "firebase/firestore";

export interface JournalEntry {
  id: string;
  bibleReference: string;
  verseText: string;
  observation: string;
  teaching: string;
  application: string;
  tags: string[];
  createdAt: Timestamp; 
}
