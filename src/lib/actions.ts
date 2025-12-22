'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { doc, collection, Timestamp, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { addDoc, setDoc, deleteDoc } from 'firebase/firestore';


const FormSchema = z.object({
  id: z.string(),
  bibleVerse: z.string().min(3, 'La cita bíblica es requerida.'),
  verseText: z.string().min(10, 'El texto del versículo es requerido.'),
  observation: z.string().min(10, 'La observación es requerida.'),
  teaching: z.string().min(10, 'La enseñanza es requerida.'),
  practicalApplication: z.string().min(10, 'La aplicación práctica es requerida.'),
  tagIds: z.string(),
});

const CreateEntry = FormSchema.omit({ id: true });
const UpdateEntry = FormSchema;

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

export async function addEntry(prevState: State, formData: FormData) {
  const validatedFields = CreateEntry.safeParse({
    bibleVerse: formData.get('bibleVerse'),
    verseText: formData.get('verseText'),
    observation: formData.get('observation'),
    teaching: formData.get('teaching'),
    practicalApplication: formData.get('practicalApplication'),
    tagIds: formData.get('tagIds'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Faltan campos. No se pudo crear la entrada.',
    };
  }

  const { bibleVerse, verseText, observation, teaching, practicalApplication, tagIds } = validatedFields.data;
  const userId = formData.get('userId') as string;
  if (!userId) {
      return { message: "Usuario no autenticado en el servidor."};
  }
  
  const newEntry = {
    bibleVerse,
    verseText,
    observation,
    teaching,
    practicalApplication,
    tagIds: tagIds.split(',').map(tag => tag.trim()).filter(tag => tag),
    createdAt: serverTimestamp(),
  };

  let newEntryId: string | undefined;
  try {
    const { firestore } = initializeFirebase();
    const entriesCollection = collection(firestore, 'users', userId, 'journalEntries');
    const docRef = await addDoc(entriesCollection, newEntry);
    newEntryId = docRef.id;
  } catch(error: any) {
      console.error("Error adding document: ", error);
      return { message: `Error al guardar en la base de datos: ${error.message}` };
  }
  
  if (newEntryId) {
    revalidatePath('/');
    redirect(`/entry/${newEntryId}`);
  } else {
    revalidatePath('/');
    redirect('/');
  }
}

export async function updateEntry(prevState: State, formData: FormData) {
  const validatedFields = UpdateEntry.safeParse({
    id: formData.get('id'),
    bibleVerse: formData.get('bibleVerse'),
    verseText: formData.get('verseText'),
    observation: formData.get('observation'),
    teaching: formData.get('teaching'),
    practicalApplication: formData.get('practicalApplication'),
    tagIds: formData.get('tagIds'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Faltan campos. No se pudo actualizar la entrada.',
    };
  }

  const { id, ...data } = validatedFields.data;
  const userId = formData.get('userId') as string;
  if (!userId) {
     return { message: "Usuario no autenticado en el servidor."};
  }
  
  try {
    const { firestore } = initializeFirebase();
    const entryRef = doc(firestore, 'users', userId, 'journalEntries', id);
    await setDoc(entryRef, {
      ...data,
      tagIds: data.tagIds.split(',').map(tag => tag.trim()).filter(tag => tag),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error: any) {
      console.error("Error updating document: ", error);
      return { message: `Error al actualizar en la base de datos: ${error.message}` };
  }

  revalidatePath('/');
  revalidatePath(`/entry/${id}`);
  revalidatePath(`/entry/${id}/edit`);
  redirect(`/entry/${id}`);
}

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
