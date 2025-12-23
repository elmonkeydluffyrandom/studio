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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import type { JournalEntry } from '@/lib/types';
import { useUser, useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { collection, doc, addDoc, setDoc, Timestamp } from 'firebase/firestore';
import { BIBLE_BOOKS } from '@/lib/bible-books';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const FormSchema = z.object({
  bibleBook: z.string({ required_error: "Por favor selecciona un libro."}).min(1, 'El libro es requerido.'),
  bibleVerse: z.string().min(1, 'La cita es requerida (ej. 1:1-5).'),
  verseText: z.string().min(10, 'El texto del versículo es requerido.'),
  observation: z.string().min(10, 'La observación es requerida.'),
  teaching: z.string().min(10, 'La enseñanza es requerida.'),
  practicalApplication: z.string().min(10, 'La aplicación práctica es requerida.'),
  tagIds: z.string().optional(),
});

type JournalFormValues = z.infer<typeof FormSchema>;

interface JournalFormProps {
  entry?: JournalEntry;
  onSave?: () => void;
  isModal?: boolean;
}

export default function JournalForm({ entry, onSave, isModal = false }: JournalFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { user } = useUser();
  const firestore = useFirestore();
  const isEditing = !!entry;

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      bibleBook: entry?.bibleBook || '',
      bibleVerse: entry ? (entry.bibleVerse || '').replace(entry.bibleBook || '', '').trim() : '',
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

    startTransition(() => {
        const tags = data.tagIds?.split(',').map(tag => tag.trim()).filter(tag => tag) || [];
        const completeBibleVerse = `${data.bibleBook} ${data.bibleVerse}`;

        const entryData = {
          ...data,
          bibleVerse: completeBibleVerse,
          tagIds: tags,
        };

        if (isEditing && entry?.id) {
            const entryRef = doc(firestore, 'users', user.uid, 'journalEntries', entry.id);
            setDoc(entryRef, {
                ...entryData,
                updatedAt: Timestamp.now()
            }, { merge: true }).catch(error => {
                console.error("Error updating entry:", error);
                if (error.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: entryRef.path,
                        operation: 'update',
                        requestResourceData: entryData,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                } else {
                   toast({
                    variant: 'destructive',
                    title: 'Error al actualizar',
                    description: error.message || 'No se pudo guardar la entrada.',
                    });
                }
            });
            
            toast({
              title: 'Entrada actualizada',
              description: 'Tu entrada ha sido guardada exitosamente.',
            });
            if (onSave) onSave();
            router.refresh();

        } else {
            const entriesCollection = collection(firestore, 'users', user.uid, 'journalEntries');
            const newEntry = {
              ...entryData,
              createdAt: Timestamp.now(),
            };
            
            addDoc(entriesCollection, newEntry).catch(error => {
                console.error("Error creating entry:", error);
                if (error.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: entriesCollection.path,
                        operation: 'create',
                        requestResourceData: newEntry,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                } else {
                   toast({
                    variant: 'destructive',
                    title: 'Error al crear',
                    description: error.message || 'No se pudo guardar la entrada.',
                    });
                }
            });
            
            toast({
              title: 'Entrada creada',
              description: 'Tu nueva entrada ha sido guardada.',
            });
            if (onSave) onSave();
            else router.push(`/`);
        }
    });
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-4 space-y-6 sm:space-y-0">
            <FormField
            control={form.control}
            name="bibleBook"
            render={({ field }) => (
                <FormItem className="sm:col-span-2">
                <FormLabel>Libro</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona un libro..." />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {BIBLE_BOOKS.map(book => (
                        <SelectItem key={book} value={book}>{book}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />

            <FormField
            control={form.control}
            name="bibleVerse"
            render={({ field }) => (
                <FormItem className="sm:col-span-1">
                <FormLabel>Cita (Cap:Ver)</FormLabel>
                <FormControl>
                    <Input placeholder="Ej: 23:1-4" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
            control={form.control}
            name="verseText"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Texto del Versículo (S - Scripture)</FormLabel>
                <FormControl>
                <Textarea
                    placeholder="Escribe aquí el texto del versículo..."
                    className="min-h-[100px] font-serif"
                    {...field}
                />
                </FormControl>
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
                    className="min-h-[120px]"
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
                <FormLabel>Aplicación (A - Application)</FormLabel>
                <FormControl>
                <Textarea
                    placeholder="¿Cómo aplicarás esta verdad a tu vida? ¿Hay algún pecado que confesar, una promesa que reclamar, o un mandato que obedecer?"
                    className="min-h-[120px]"
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
                <FormLabel>Oración (P - Prayer)</FormLabel>
                <FormControl>
                <Textarea
                    placeholder="Escribe una oración basada en tu estudio. Habla con Dios sobre lo que has aprendido."
                    className="min-h-[120px]"
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
            {isModal ? (
                <Button type="button" variant="outline" onClick={onSave}>
                    Cancelar
                </Button>
            ) : (
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                </Button>
            )}
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isEditing ? 'Guardar Cambios' : 'Crear Entrada'}
            </Button>
        </div>
      </form>
    </Form>
  );

  if (isModal) {
    return <div className="max-h-[80vh] overflow-y-auto p-1 pr-4">{formContent}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{isEditing ? 'Editar Entrada' : 'Nueva Entrada'}</CardTitle>
        <CardDescription>
          Utiliza el método S.O.A.P para tu estudio bíblico.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}
