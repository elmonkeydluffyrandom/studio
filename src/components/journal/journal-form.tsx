'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import type { JournalEntry } from '@/lib/types';
import { useUser, useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { collection, doc, addDoc, setDoc, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

const FormSchema = z.object({
  bibleVerse: z.string().min(3, 'La cita bíblica es requerida.'),
  verseText: z.string().min(10, 'El texto del versículo es requerido.'),
  observation: z.string().min(10, 'La observación es requerida.'),
  teaching: z.string().min(10, 'La enseñanza es requerida.'),
  practicalApplication: z.string().min(10, 'La aplicación práctica es requerida.'),
  tagIds: z.string().optional(),
});

type JournalFormValues = z.infer<typeof FormSchema>;

interface JournalFormProps {
  entry?: JournalEntry;
}

export default function JournalForm({ entry }: JournalFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();
  const isEditing = !!entry;

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      bibleVerse: entry?.bibleVerse || '',
      verseText: entry?.verseText || '',
      observation: entry?.observation || '',
      teaching: entry?.teaching || '',
      practicalApplication: entry?.practicalApplication || '',
      tagIds: entry?.tagIds?.join(', ') || '',
    },
  });

  const onSubmit = (data: JournalFormValues) => {
    if (!user || !firestore) {
        toast({
            variant: 'destructive',
            title: 'Error de autenticación',
            description: 'Debes iniciar sesión para guardar una entrada.',
        });
        return;
    }

    startTransition(async () => {
      try {
        const tags = data.tagIds?.split(',').map(tag => tag.trim()).filter(tag => tag) || [];
        
        if (isEditing && entry?.id) {
            // Update existing entry
            const entryRef = doc(firestore, 'users', user.uid, 'journalEntries', entry.id);
            await setDoc(entryRef, {
                ...data,
                tagIds: tags,
                updatedAt: Timestamp.now()
            }, { merge: true });
            
            toast({
              title: 'Entrada actualizada',
              description: 'Tu entrada ha sido guardada exitosamente.',
            });
            router.push(`/entry/${entry.id}`);

        } else {
            // Create new entry
            const entriesCollection = collection(firestore, 'users', user.uid, 'journalEntries');
            const newEntry = {
              ...data,
              tagIds: tags,
              createdAt: Timestamp.now(),
            };
            const docRef = await addDoc(entriesCollection, newEntry);
            
            toast({
              title: 'Entrada creada',
              description: 'Tu entrada ha sido guardada exitosamente.',
            });
            router.push(`/entry/${docRef.id}`);
        }
        router.refresh();

      } catch (error: any) {
        console.error("Error saving entry:", error);

        if (error.code === 'permission-denied') {
            const path = isEditing ? `users/${user.uid}/journalEntries/${entry.id}` : `users/${user.uid}/journalEntries`;
            const operation = isEditing ? 'update' : 'create';
            const permissionError = new FirestorePermissionError({
                path: path,
                operation: operation,
                requestResourceData: data,
            });
            errorEmitter.emit('permission-error', permissionError);
        }

        toast({
          variant: 'destructive',
          title: 'Error al guardar',
          description: error.message || 'No se pudo guardar la entrada. Revisa la consola para más detalles.',
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{isEditing ? 'Editar Entrada' : 'Nueva Entrada'}</CardTitle>
        <CardDescription>
          Utiliza el método S.O.A.P para tu estudio bíblico.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="bibleVerse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cita Bíblica (S - Scripture)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Salmos 23:1" {...field} />
                  </FormControl>
                  <FormDescription>Escribe la referencia del versículo que estás estudiando.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="verseText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto del Versículo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Escribe aquí el texto del versículo..."
                      className="min-h-[120px] font-serif"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Escribe manualmente el texto del versículo que estás estudiando.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observación (O - Observation)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="¿Qué dice el texto? ¿Cuál es el contexto, los hechos, las personas involucradas?"
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="teaching"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enseñanza (A - Application / Part 1)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="¿Qué significa este pasaje? ¿Qué principio o verdad teológica enseña sobre Dios, el hombre, o la salvación?"
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="practicalApplication"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aplicación Práctica (P - Prayer / Part 2)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="¿Cómo aplicarás esta verdad a tu vida? ¿Hay algún pecado que confesar, una promesa que reclamar, o un mandato que obedecer?"
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tagIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etiquetas</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Oración, Familia, Fe" {...field} />
                  </FormControl>
                  <FormDescription>Separa las etiquetas con comas.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditing ? 'Guardar Cambios' : 'Crear Entrada'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
