'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { deleteDoc } from 'firebase/firestore';


const FormSchema = z.object({
  id: z.string(),
  bibleVerse: z.string().min(3, 'La cita bíblica es requerida.'),
  verseText: z.string().min(10, 'El texto del versículo es requerido.'),
  observation: z.string().min(10, 'La observación es requerida.'),
  teaching: z.string().min(10, 'La enseñanza es requerida.'),
  practicalApplication: z.string().min(10, 'La aplicación práctica es requerida.'),
  tagIds: z.string(),
});


export type State = {
  errors?: {
    bibleVerse?: string[];
    verseText?: string[];
    observation?: string[];
    teaching?: string[];
    practicalApplication?: string[];
    tagIds?: string[];
  };
  message?: string | null;
};

export async function deleteEntry(userId: string, id: string) {
  if (!userId) {
    throw new Error("Usuario no autenticado.");
  }
  
  if (!id) {
    throw new Error('ID de entrada no proporcionado.');
  }

  try {
    const { firestore } = initializeFirebase();
    const entryRef = doc(firestore, 'users', userId, 'journalEntries', id);
    await deleteDoc(entryRef);
  } catch(error: any) {
      console.error("Error deleting document: ", error);
      throw new Error('Error al eliminar de la base de datos.');
  }

  revalidatePath('/');
}
