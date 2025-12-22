'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
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
import { useDebounce } from '@/lib/hooks/use-debounce';
import { runFlow } from '@genkit-ai/next/client';
import { verseAutocompletion } from '@/ai/flows/verse-autocompletion';

const FormSchema = z.object({
  bibleReference: z.string().min(3, 'La cita bíblica es requerida.'),
  verseText: z.string().min(10, 'El texto del versículo es requerido.'),
  observation: z.string().min(10, 'La observación es requerida.'),
  teaching: z.string().min(10, 'La enseñanza es requerida.'),
  application: z.string().min(10, 'La aplicación práctica es requerida.'),
  tags: z.string().optional(),
});

type JournalFormValues = z.infer<typeof FormSchema>;

interface JournalFormProps {
  entry?: JournalEntry;
  action: (prevState: any, formData: FormData) => Promise<any>;
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
      {isEditing ? 'Guardar Cambios' : 'Crear Entrada'}
    </Button>
  );
}

export default function JournalForm({ entry, action }: JournalFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [initialState, formAction] = useFormState(action, { message: null, errors: {} });
  const isEditing = !!entry;

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      bibleReference: entry?.bibleReference || '',
      verseText: entry?.verseText || '',
      observation: entry?.observation || '',
      teaching: entry?.teaching || '',
      application: entry?.application || '',
      tags: entry?.tags?.join(', ') || '',
    },
  });

  const [isAutocompleting, setIsAutocompleting] = useState(false);
  const verseRefToAutocomplete = useDebounce(form.watch('bibleReference'), 1000);

  useEffect(() => {
    async function autocompleteVerse() {
      if (verseRefToAutocomplete && verseRefToAutocomplete.length > 4 && verseRefToAutocomplete !== entry?.bibleReference) {
        setIsAutocompleting(true);
        try {
          const result = await runFlow(verseAutocompletion, { verseReference: verseRefToAutocomplete });
          if(result.verseText) {
            form.setValue('verseText', result.verseText, { shouldValidate: true });
          }
        } catch (error) {
          console.error("Verse autocompletion failed:", error);
          toast({
            variant: "destructive",
            title: "Error de autocompletado",
            description: "No se pudo obtener el texto del versículo.",
          });
        } finally {
          setIsAutocompleting(false);
        }
      }
    }
    autocompleteVerse();
  }, [verseRefToAutocomplete, form, entry?.bibleReference, toast]);

  useEffect(() => {
    if (initialState.message && initialState.errors) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: initialState.message,
      });
    }
  }, [initialState, toast]);

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
          <form action={formAction} className="space-y-8">
            <input type="hidden" name="id" value={entry?.id} />
            
            <FormField
              control={form.control}
              name="bibleReference"
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
                  <FormLabel className="flex items-center gap-2">
                    Texto del Versículo
                    {isAutocompleting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="El texto del versículo aparecerá aquí..."
                      className="min-h-[120px] font-serif"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Se autocompletará basado en la cita. Versión Reina Valera 1960.</FormDescription>
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
              name="application"
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
              name="tags"
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
              <SubmitButton isEditing={isEditing} />
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
