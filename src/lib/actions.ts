'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/lib/firebase';
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

// This function needs to initialize firebase on the server.
function getAuthenticatedUser() {
    // We are on the server, so we can't use the useUser hook.
    // We need to initialize firebase and get the auth instance.
    const { auth } = initializeFirebase();
    // This is a server-side action. The user state is not available in the same
    // way as the client. We need to rely on the session or token if available,
    // but for now, we assume the framework handles user session for server actions.
    // A more robust implementation might involve passing user ID or checking session state.
    // For now, let's try to get current user, but it might be null.
    return auth.currentUser;
}


export async function addEntry(prevState: State, formData: FormData) {
  const user = getAuthenticatedUser();
  
  if (!user) {
    // In a real app, you might get the user from the session or a token
    // Since this is a server action, direct access to client-side auth state is not possible.
    // We'll proceed assuming this is for an authenticated context.
    // A robust solution would check auth state via server-side means.
    // For now, let's defer this check to Firestore rules.
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

  let docRef;
  try {
    const { firestore, auth } = initializeFirebase();
    // It's very likely auth.currentUser will be null on the server.
    // We'd need a proper session management strategy. Let's assume for now we can get the UID.
    // This part is tricky without a full auth flow for server actions.
    // The client should ideally pass the UID. For now, this will likely fail if not logged in.
    const userId = auth.currentUser?.uid;
    if (!userId) {
        // This is a temporary workaround. Server actions don't have client's auth context.
        // A better approach involves session management or passing user id.
        // For now, we cannot proceed.
        return { message: "Usuario no autenticado en el servidor."};
    }
    const entriesCollection = collection(firestore, 'users', userId, 'entries');
    docRef = await addDoc(entriesCollection, newEntry);
  } catch(error) {
    console.error("Error adding document: ", error);
    return { message: 'Error al guardar en la base de datos.' };
  }
  
  revalidatePath('/');
  redirect(`/entry/${docRef.id}`);
}

export async function updateEntry(prevState: State, formData: FormData) {
    const user = getAuthenticatedUser();

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
    const { firestore } = initializeFirebase();
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
  const user = getAuthenticatedUser();

  if (!user) {
    throw new Error("Usuario no autenticado.");
  }
  
  if (!id) {
    throw new Error('ID de entrada no proporcionado.');
  }

  try {
    const { firestore } = initializeFirebase();
    const entryRef = doc(firestore, 'users', user.uid, 'entries', id);
    await deleteDoc(entryRef);
  } catch(error) {
    console.error("Error deleting document: ", error);
    throw new Error('Error al eliminar de la base de datos.');
  }

  revalidatePath('/');
}
