'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/lib/firebase';
import { setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';


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
  const userId = formData.get('userId') as string;
  if (!userId) {
      return { message: "Usuario no autenticado en el servidor."};
  }
  
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
    const { firestore } = initializeFirebase();
    const entriesCollection = collection(firestore, 'users', userId, 'entries');
    const docRef = await addDoc(entriesCollection, newEntry);
    revalidatePath('/');
    redirect(`/entry/${docRef.id}`);

  } catch(error: any) {
     if (error instanceof FirestorePermissionError) {
      errorEmitter.emit('permission-error', error);
    } else {
      console.error("Error adding document: ", error);
      return { message: 'Error al guardar en la base de datos.' };
    }
  }
  
}

export async function updateEntry(prevState: State, formData: FormData) {
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
  const userId = formData.get('userId') as string;
  if (!userId) {
     return { message: "Usuario no autenticado en el servidor."};
  }
  
  try {
    const { firestore } = initializeFirebase();
    const entryRef = doc(firestore, 'users', userId, 'entries', id);
    await updateDoc(entryRef, {
      ...data,
      tags: data.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
    });
  } catch (error: any) {
    if (error instanceof FirestorePermissionError) {
      errorEmitter.emit('permission-error', error);
    } else {
      console.error("Error updating document: ", error);
      return { message: 'Error al actualizar en la base de datos.' };
    }
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
    const entryRef = doc(firestore, 'users', userId, 'entries', id);
    await deleteDoc(entryRef);
  } catch(error: any) {
     if (error instanceof FirestorePermissionError) {
      errorEmitter.emit('permission-error', error);
    } else {
      console.error("Error deleting document: ", error);
      throw new Error('Error al eliminar de la base de datos.');
    }
  }

  revalidatePath('/');
}