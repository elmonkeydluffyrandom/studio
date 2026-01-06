// src/lib/types.ts
import { Timestamp } from "firebase/firestore";

// Interfaz principal para las entradas del diario
export interface JournalEntry {
  // Identificación
  id: string;
  userId: string;
  
  // Información bíblica
  bibleBook: string;
  chapter: number;
  bibleVerse: string; // Ejemplo: "3:16" o "1-4"
  verseText: string;
  
  // CAMPOS PRINCIPALES 
  observation: string;          // O - Observación
  teaching: string;            // S - Soberanía (o Interpretación)
  practicalApplication: string; // A - Aplicación
  
  // Etiquetas y categorización
  tagIds?: string[];
  
  // Fechas
  createdAt?: Timestamp | Date; // Cuando se creó en el sistema
  updatedAt?: Timestamp | Date; // Última actualización
}

// Interfaz para etiquetas
export interface Tag {
  id: string;
  userId: string;
  name: string;
  color?: string;
  createdAt: Timestamp | Date;
  entryCount?: number;
}
