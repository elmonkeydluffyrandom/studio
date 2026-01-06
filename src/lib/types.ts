// src/lib/types.ts

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
  
  // CAMPOS PRINCIPALES (nuevos nombres - los que usa JournalForm)
  observation: string;          // O - Observación
  teaching: string;            // S - Soberanía (o Interpretación)
  practicalApplication: string; // A - Aplicación
  
  // CAMPOS DE COMPATIBILIDAD (nombres antiguos)
  observacion?: string;        // Alias para observation
  ensenanza?: string;          // Alias para teaching
  aplicacion?: string;         // Alias para practicalApplication
  practica?: string;           // Alias alternativo para practicalApplication
  
  // Etiquetas y categorización
  tagIds?: string[];
  
  // Fechas
  fecha: Date;                // Fecha de la reflexión
  createdAt?: Date;           // Cuando se creó en el sistema
  updatedAt: Date;            // Última actualización
  
  // Control de sincronización offline
  isSynced?: boolean;         // Si está sincronizado con Firestore
  lastSyncAttempt?: Date;     // Último intento de sincronización
  syncError?: string;         // Error de sincronización si hubo
  
  // Metadatos
  wordCount?: number;         // Conteo de palabras (opcional)
  isFavorite?: boolean;       // Si está marcado como favorito
  mood?: string;              // Estado de ánimo (opcional)
}

// Interfaz para etiquetas
export interface Tag {
  id: string;
  userId: string;
  name: string;
  color?: string;
  createdAt: Date;
  entryCount?: number;
}

// Interfaz para usuario
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
  lastLogin: Date;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    defaultBibleVersion?: string;
    dailyReminder?: boolean;
    reminderTime?: string;
    offlineMode?: boolean;
  };
  stats?: {
    totalEntries: number;
    entriesThisMonth: number;
    streakDays: number;
    lastEntryDate?: Date;
  };
}
