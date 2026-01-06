'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/rich-text-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BIBLE_BOOKS } from '@/lib/bible-books';
import type { JournalEntry } from '@/lib/types';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z.object({
  bibleBook: z.string().min(1, 'El libro es requerido.'),
  chapter: z.coerce.number().min(1, 'El capítulo es requerido.'),
  bibleVerse: z.string().min(1, 'El versículo es requerido.'),
  verseText: z.string().min(1, 'El texto del versículo es requerido.'),
  observation: z.string().optional(),
  teaching: z.string().optional(),
  practicalApplication: z.string().optional(),
  tagIds: z.string().optional(),
});

type JournalFormData = z.infer<typeof formSchema>;

interface JournalFormProps {
  entry?: JournalEntry | null;
  onSave?: () => void;
  isModal?: boolean;
}

export default function JournalForm({ entry, onSave, isModal = false }: JournalFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<JournalFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bibleBook: '',
      chapter: 1,
      bibleVerse: '',
      verseText: '',
      observation: '',
      teaching: '',
      practicalApplication: '',
      tagIds: '',
    },
  });

  useEffect(() => {
    if (entry) {
      console.log('Cargando datos en editor...', entry);
      form.reset({
        bibleBook: entry.bibleBook || '',
        chapter: entry.chapter || 1,
        bibleVerse: entry.bibleVerse || '',
        verseText: entry.verseText || '',
        observation: entry.observation || '',
        teaching: entry.teaching || '',
        practicalApplication: entry.practicalApplication || '',
        tagIds: Array.isArray(entry.tagIds) ? entry.tagIds.join(', ') : '',
      });
    }
  }, [entry, form]);


  const onSubmit = async (data: JournalFormData) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error de autenticación',
        description: 'No se pudo guardar la entrada.',
      });
      return;
    }

    try {
      const entryData = {
        ...data,
        userId: user.uid,
        tagIds: data.tagIds ? data.tagIds.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        updatedAt: serverTimestamp(),
      };

      let entryId: string;

      if (entry?.id) {
        entryId = entry.id;
        const entryRef = doc(firestore, 'users', user.uid, 'journalEntries', entryId);
        await setDoc(entryRef, { ...entryData, createdAt: entry.createdAt || serverTimestamp() }, { merge: true });
        toast({
          title: '✅ Entrada Actualizada',
          description: 'Tu reflexión ha sido guardada con éxito.',
        });
      } else {
        const entriesCollection = collection(firestore, 'users', user.uid, 'journalEntries');
        const newDocData = { ...entryData, createdAt: serverTimestamp() };
        const newDocRef = await addDoc(entriesCollection, newDocData);
        entryId = newDocRef.id;
        toast({
          title: '🎉 Nueva Entrada Creada',
          description: 'Tu reflexión ha sido añadida a tu diario.',
        });
      }
      
      onSave?.();
      
      // Solo redirige si no es un modal
      if (!isModal) {
        router.push(`/entry/${entryId}`);
      } else {
        router.refresh(); // Refresca los datos en la página actual
      }

    } catch (error) {
      console.error('Error guardando entrada:', error);
      toast({
        variant: 'destructive',
        title: '❌ Error al Guardar',
        description: 'Hubo un problema al guardar tu entrada. Por favor, intenta de nuevo.',
      });
    }
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Referencia Bíblica */}
        <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="bibleBook"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Libro *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un libro" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <ScrollArea className="h-72">
                      {BIBLE_BOOKS.map(book => (
                        <SelectItem key={book} value={book}>
                          {book}
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="chapter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capítulo *</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bibleVerse"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Versículo(s) *</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: 16 o 16-18" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        <FormField
          control={form.control}
          name="verseText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Escritura (S - Scripture) *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Escribe o pega el texto del versículo aquí..."
                  rows={4}
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
                <RichTextEditor
                  placeholder="¿Qué dice el texto? ¿Cuál es el contexto, los hechos, las personas involucradas?"
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
              <FormLabel>Enseñanza</FormLabel>
              <FormControl>
                <RichTextEditor
                  placeholder="¿Qué te enseña Dios a través de este pasaje sobre su carácter o sus promesas?"
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
              <FormLabel>Aplicación Práctica</FormLabel>
              <FormControl>
                <RichTextEditor
                  placeholder="¿Cómo aplicarás esta verdad a tu vida? ¿Qué cambios prácticos harás?"
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
              <FormLabel>Etiquetas (separadas por comas)</FormLabel>
              <FormControl>
                <Input placeholder="fe, oración, familia" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <CardFooter className="px-0 pt-6 flex-col sm:flex-row gap-2">
            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.formState.isSubmitting ? 'Guardando...' : entry ? 'Guardar Cambios' : 'Crear Entrada'}
            </Button>
            <Button type="button" variant="outline" onClick={() => isModal ? onSave?.() : router.back()} className="w-full sm:w-auto mt-2 sm:mt-0">
              Cancelar
            </Button>
        </CardFooter>
      </form>
    </Form>
  );

  if (isModal) {
    return formContent;
  }

  return (
    <div className="p-2 sm:p-4">
      <Card className="border-none shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-headline">
            {entry ? 'Editar Reflexión' : 'Nueva Reflexión'}
          </CardTitle>
          <CardDescription>
            Utiliza el método S.O.A.P para tu estudio bíblico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formContent}
        </CardContent>
      </Card>
    </div>
  );
}
