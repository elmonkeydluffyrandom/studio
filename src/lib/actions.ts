'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { mockEntries } from './mock-data';
import type { JournalEntry } from './types';

// Simulate a database delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

export async function getEntries(): Promise<JournalEntry[]> {
  await sleep(500);
  return mockEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getEntry(id: string): Promise<JournalEntry | undefined> {
  await sleep(300);
  return mockEntries.find(entry => entry.id === id);
}

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
  
  const newEntry: JournalEntry = {
    id: String(Date.now()),
    bibleReference,
    verseText,
    observation,
    teaching,
    application,
    tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
    createdAt: new Date().toISOString(),
  };

  await sleep(500);
  mockEntries.unshift(newEntry);

  revalidatePath('/');
  redirect('/');
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
  const entryIndex = mockEntries.findIndex(entry => entry.id === id);

  if (entryIndex === -1) {
    return { message: 'Entrada no encontrada.' };
  }

  await sleep(500);

  const updatedEntry = {
    ...mockEntries[entryIndex],
    ...data,
    tags: data.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
  };
  mockEntries[entryIndex] = updatedEntry;

  revalidatePath('/');
  revalidatePath(`/entry/${id}`);
  revalidatePath(`/entry/${id}/edit`);
  redirect(`/entry/${id}`);
}

export async function deleteEntry(id: string) {
  await sleep(500);
  const index = mockEntries.findIndex(entry => entry.id === id);
  if (index !== -1) {
    mockEntries.splice(index, 1);
    revalidatePath('/');
    redirect('/');
  } else {
    return { message: 'Entrada no encontrada.' };
  }
}
