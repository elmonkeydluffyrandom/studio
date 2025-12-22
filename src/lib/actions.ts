'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getFirestore, doc, addDoc, updateDoc, deleteDoc, getDoc, collection, Timestamp, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/index';
import { getAuth } from 'firebase/auth';


const FormSchema = z.object({
  id: z.string(),
  bibleReference: z.string().min(3, 'La cita bíblica es requerida.'),
  verseText: z.string().min(10, 'El texto del versículo es requerido.'),
  observation: z.string().min(10, 'La observación es requerida.'),
  teaching: z.string().min(10, 'La enseñanza es requerida.'),
  application: z.string().min(10, 'La aplicación práctica es requerida.'),
  tags: z.string(),
});

const CreateEntry = FormSchema.omit({ id: true });
const UpdateEntry = FormSchema;

export type State = {
  errors?: {
    bibleReference?: string[];
    verseText?: string[];
    observation?: string[];
    teaching?: string[];
    application?: string[];
    tags?: string[];
  };
  message?: string | null;
};

export async function addEntry(prevState: State, formData: FormData) {
  const { firestore, auth } = initializeFirebase();
  const user = auth.currentUser;
  
  if (!user) {
    return { message: "Usuario no autenticado."};
  }

  const validatedFields = CreateEntry.safeParse({
    bibleReference: formData.get('bibleReference'),
    verseText: formData.get('verseText'),
    observation: formData.get('observation'),
    teaching: formData.get('teaching'),
    application: formData.get('application'),
    tags: formData.get('tags'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Faltan campos. No se pudo crear la entrada.',
    };
  }

  const { bibleReference, verseText, observation, teaching, application, tags } = validatedFields.data;
  
  const newEntry = {
    bibleReference,
    verseText,
    observation,
    teaching,
    application,
    tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
    createdAt: serverTimestamp(),
  };

  try {
    const entriesCollection = collection(firestore, 'users', user.uid, 'entries');
    await addDoc(entriesCollection, newEntry);
  } catch(error) {
    console.error("Error adding document: ", error);
    return { message: 'Error al guardar en la base de datos.' };
  }

  revalidatePath('/');
  redirect('/');
}

export async function updateEntry(prevState: State, formData: FormData) {
  const { firestore, auth } = initializeFirebase();
  const user = auth.currentUser;

  if (!user) {
    return { message: "Usuario no autenticado."};
  }

  const validatedFields = UpdateEntry.safeParse({
    id: formData.get('id'),
    bibleReference: formData.get('bibleReference'),
    verseText: formData.get('verseText'),
    observation: formData.get('observation'),
    teaching: formData.get('teaching'),
    application: formData.get('application'),
    tags: formData.get('tags'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Faltan campos. No se pudo actualizar la entrada.',
    };
  }

  const { id, ...data } = validatedFields.data;
  
  try {
    const entryRef = doc(firestore, 'users', user.uid, 'entries', id);
    await updateDoc(entryRef, {
      ...data,
      tags: data.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
    });
  } catch (error) {
    console.error("Error updating document: ", error);
    return { message: 'Error al actualizar en la base de datos.' };
  }

  revalidatePath('/');
  revalidatePath(`/entry/${id}`);
  revalidatePath(`/entry/${id}/edit`);
  redirect(`/entry/${id}`);
}

export async function deleteEntry(id: string) {
  const { firestore, auth } = initializeFirebase();
  const user = auth.currentUser;

  if (!user) {
    return { message: "Usuario no autenticado."};
  }
  
  if (!id) {
    return { message: 'ID de entrada no proporcionado.' };
  }

  try {
    const entryRef = doc(firestore, 'users', user.uid, 'entries', id);
    await deleteDoc(entryRef);
  } catch(error) {
    console.error("Error deleting document: ", error);
    return { message: 'Error al eliminar de la base de datos.' };
  }

  revalidatePath('/');
  redirect('/');
}
