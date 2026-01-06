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
  
  // 📌 CAMPOS PRINCIPALES (nuevos nombres - los que usa JournalForm)
  observation: string;          // O - Observación
  teaching: string;            // S - Soberanía (o Interpretación)
  practicalApplication: string; // A - Aplicación
  
  // 📌 CAMPOS DE COMPATIBILIDAD (nombres antiguos)
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

// Interfaz para datos offline
export interface OfflineEntry {
  id: string;
  userId: string;
  action: 'create' | 'update' | 'delete';
  data: Partial<JournalEntry>;
  timestamp: Date;
  attemptCount: number;
  lastAttempt?: Date;
  error?: string;
}

// Interfaz para la respuesta de la API de la Biblia (si usas una)
export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  version: string;
}

// 📌 FUNCIONES DE UTILIDAD

/**
 * Crea una entrada vacía con valores por defecto
 */
export function createEmptyEntry(userId: string): Omit<JournalEntry, 'id'> {
  return {
    userId,
    bibleBook: '',
    chapter: 1,
    bibleVerse: '',
    verseText: '',
    observation: '',
    teaching: '',
    practicalApplication: '',
    tagIds: [],
    fecha: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isSynced: true,
    isFavorite: false,
    mood: 'neutral',
  };
}

/**
 * Normaliza una entrada desde cualquier fuente (Firestore, localStorage, etc.)
 * Convierte nombres de campos inconsistentes a un formato estándar
 */
export function normalizeJournalEntry(data: any): JournalEntry {
  if (!data) {
    return {
      id: '',
      userId: '',
      bibleBook: '',
      chapter: 1,
      bibleVerse: '',
      verseText: '',
      observation: '',
      teaching: '',
      practicalApplication: '',
      fecha: new Date(),
      updatedAt: new Date(),
      isSynced: true,
    };
  }
  
  // Extraer el ID (puede venir de diferentes maneras)
  const id = data.id || data._id || '';
  
  // Estrategia de normalización inteligente para campos de texto
  const getObservation = (): string => {
    // Prioridad 1: Campo nuevo (observation)
    if (data.observation && typeof data.observation === 'string' && data.observation.trim()) {
      return data.observation.trim();
    }
    // Prioridad 2: Campo antiguo (observacion)
    if (data.observacion && typeof data.observacion === 'string' && data.observacion.trim()) {
      return data.observacion.trim();
    }
    // Prioridad 3: Cualquier otro campo que pueda contener la observación
    if (data.Observacion && typeof data.Observacion === 'string') {
      return data.Observacion.trim();
    }
    if (data.OBSERVACION && typeof data.OBSERVACION === 'string') {
      return data.OBSERVACION.trim();
    }
    return '';
  };
  
  const getTeaching = (): string => {
    // Prioridad 1: Campo nuevo (teaching)
    if (data.teaching && typeof data.teaching === 'string' && data.teaching.trim()) {
      return data.teaching.trim();
    }
    // Prioridad 2: Campo antiguo (ensenanza)
    if (data.ensenanza && typeof data.ensenanza === 'string' && data.ensenanza.trim()) {
      return data.ensenanza.trim();
    }
    // Prioridad 3: Campo alternativo (soberania, interpretacion)
    if (data.soberania && typeof data.soberania === 'string') {
      return data.soberania.trim();
    }
    if (data.interpretacion && typeof data.interpretacion === 'string') {
      return data.interpretacion.trim();
    }
    if (data.Enseñanza && typeof data.Enseñanza === 'string') {
      return data.Enseñanza.trim();
    }
    return '';
  };
  
  const getPracticalApplication = (): string => {
    // Prioridad 1: Campo nuevo (practicalApplication)
    if (data.practicalApplication && typeof data.practicalApplication === 'string' && data.practicalApplication.trim()) {
      return data.practicalApplication.trim();
    }
    // Prioridad 2: Campo antiguo (aplicacion)
    if (data.aplicacion && typeof data.aplicacion === 'string' && data.aplicacion.trim()) {
      return data.aplicacion.trim();
    }
    // Prioridad 3: Campo alternativo (practica)
    if (data.practica && typeof data.practica === 'string' && data.practica.trim()) {
      return data.practica.trim();
    }
    // Prioridad 4: Variaciones con mayúsculas
    if (data.Aplicacion && typeof data.Aplicacion === 'string') {
      return data.Aplicacion.trim();
    }
    if (data.APLICACION && typeof data.APLICACION === 'string') {
      return data.APLICACION.trim();
    }
    if (data.Practica && typeof data.Practica === 'string') {
      return data.Practica.trim();
    }
    return '';
  };
  
  // Normalizar fecha (manejar Timestamp de Firebase o string ISO)
  const normalizeDate = (dateValue: any): Date => {
    if (!dateValue) return new Date();
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      return dateValue.toDate(); // Firebase Timestamp
    }
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    if (dateValue instanceof Date) {
      return dateValue;
    }
    return new Date();
  };
  
  // Normalizar número (capítulo)
  const normalizeChapter = (chapter: any): number => {
    if (typeof chapter === 'number') return chapter;
    if (typeof chapter === 'string') {
      const num = parseInt(chapter, 10);
      return isNaN(num) ? 1 : num;
    }
    return 1;
  };
  
  // Normalizar array de etiquetas
  const normalizeTagIds = (tags: any): string[] => {
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') {
      return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    return [];
  };
  
  // Obtener valores normalizados
  const observation = getObservation();
  const teaching = getTeaching();
  const practicalApplication = getPracticalApplication();
  
  // Crear la entrada normalizada
  const normalizedEntry: JournalEntry = {
    id,
    userId: data.userId || '',
    
    // Campos bíblicos
    bibleBook: data.bibleBook || data.book || '',
    chapter: normalizeChapter(data.chapter),
    bibleVerse: data.bibleVerse || data.verse || '',
    verseText: data.verseText || data.text || '',
    
    // 📌 Campos principales (nuevos nombres)
    observation,
    teaching,
    practicalApplication,
    
    // 📌 Campos de compatibilidad (mantener ambos)
    observacion: observation, // Mismo valor que observation
    ensenanza: teaching,      // Mismo valor que teaching
    aplicacion: practicalApplication, // Mismo valor que practicalApplication
    practica: practicalApplication, // Mismo valor que practicalApplication
    
    // Etiquetas
    tagIds: normalizeTagIds(data.tagIds),
    
    // Fechas
    fecha: normalizeDate(data.fecha || data.date || data.createdAt),
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt || data.modifiedAt),
    
    // Control de sincronización
    isSynced: data.isSynced !== undefined ? data.isSynced : true,
    lastSyncAttempt: data.lastSyncAttempt ? normalizeDate(data.lastSyncAttempt) : undefined,
    syncError: data.syncError || undefined,
    
    // Metadatos opcionales
    wordCount: typeof data.wordCount === 'number' ? data.wordCount : undefined,
    isFavorite: Boolean(data.isFavorite),
    mood: data.mood || 'neutral',
  };
  
  // Calcular wordCount si no existe
  if (!normalizedEntry.wordCount) {
    const text = `${observation} ${teaching} ${practicalApplication}`;
    normalizedEntry.wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
  
  return normalizedEntry;
}

/**
 * Convierte una entrada normalizada a un formato seguro para Firestore
 */
export function journalEntryToFirestore(entry: Partial<JournalEntry>): any {
  const firestoreData: any = {};
  
  // Solo incluir campos que existen
  if (entry.bibleBook !== undefined) firestoreData.bibleBook = entry.bibleBook;
  if (entry.chapter !== undefined) firestoreData.chapter = entry.chapter;
  if (entry.bibleVerse !== undefined) firestoreData.bibleVerse = entry.bibleVerse;
  if (entry.verseText !== undefined) firestoreData.verseText = entry.verseText;
  
  // Campos principales (siempre incluir)
  firestoreData.observation = entry.observation || '';
  firestoreData.teaching = entry.teaching || '';
  firestoreData.practicalApplication = entry.practicalApplication || '';
  
  // Campos de compatibilidad (opcional)
  if (entry.observacion !== undefined) firestoreData.observacion = entry.observacion;
  if (entry.ensenanza !== undefined) firestoreData.ensenanza = entry.ensenanza;
  if (entry.aplicacion !== undefined) firestoreData.aplicacion = entry.aplicacion;
  if (entry.practica !== undefined) firestoreData.practica = entry.practica;
  
  // Otros campos
  if (entry.tagIds !== undefined) firestoreData.tagIds = entry.tagIds;
  if (entry.fecha !== undefined) firestoreData.fecha = entry.fecha;
  if (entry.userId !== undefined) firestoreData.userId = entry.userId;
  
  // Siempre actualizar updatedAt
  firestoreData.updatedAt = new Date();
  
  // Campos de control
  if (entry.isSynced !== undefined) firestoreData.isSynced = entry.isSynced;
  
  // Metadatos opcionales
  if (entry.wordCount !== undefined) firestoreData.wordCount = entry.wordCount;
  if (entry.isFavorite !== undefined) firestoreData.isFavorite = entry.isFavorite;
  if (entry.mood !== undefined) firestoreData.mood = entry.mood;
  
  return firestoreData;
}

/**
 * Compara dos entradas para ver si son diferentes
 * Útil para evitar guardados innecesarios
 */
export function areEntriesDifferent(entry1: Partial<JournalEntry>, entry2: Partial<JournalEntry>): boolean {
  const fieldsToCompare: (keyof JournalEntry)[] = [
    'bibleBook', 'chapter', 'bibleVerse', 'verseText',
    'observation', 'teaching', 'practicalApplication',
    'tagIds', 'fecha', 'isFavorite', 'mood'
  ];
  
  return fieldsToCompare.some(field => {
    const val1 = entry1[field];
    const val2 = entry2[field];
    
    // Comparar arrays
    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length !== val2.length) return true;
      return val1.some((item, index) => item !== val2[index]);
    }
    
    // Comparar fechas
    if (val1 instanceof Date && val2 instanceof Date) {
      return val1.getTime() !== val2.getTime();
    }
    
    // Comparación simple
    return val1 !== val2;
  });
}

/**
 * Valida si una entrada está completa para ser guardada
 */
export function isEntryComplete(entry: Partial<JournalEntry>): {
  isValid: boolean;
  missingFields: string[];
} {
  const requiredFields: (keyof JournalEntry)[] = [
    'bibleBook',
    'chapter',
    'bibleVerse',
    'verseText',
    'observation',
    'teaching',
    'practicalApplication'
  ];
  
  const missingFields: string[] = [];
  
  requiredFields.forEach(field => {
    const value = entry[field];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push(field);
    }
  });
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

// 📌 TIPOS PARA LOS COMPONENTES

export type FormMode = 'create' | 'edit' | 'view';

export interface JournalFormData {
  bibleBook: string;
  chapter: number;
  bibleVerse: string;
  verseText: string;
  observation: string;
  teaching: string;
  practicalApplication: string;
  tagIds: string;
  fecha?: Date;
}

// 📌 ENUMS ÚTILES

export enum EntryStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  ERROR = 'error',
  OFFLINE = 'offline'
}

export enum Mood {
  JOYFUL = 'joyful',
  PEACEFUL = 'peaceful',
  HOPEFUL = 'hopeful',
  NEUTRAL = 'neutral',
  REFLECTIVE = 'reflective',
  CHALLENGED = 'challenged',
  GRATEFUL = 'grateful'
}

// 📌 INTERFACES PARA LAS RESPUESTAS DE LA API

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface EntriesResponse {
  entries: JournalEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SyncResponse {
  syncedEntries: number;
  failedEntries: number;
  pendingEntries: number;
}