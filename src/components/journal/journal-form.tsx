'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
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

// Importación dinámica del editor
const RichTextEditor = dynamic(() => import('../rich-text-editor').then((mod) => mod.RichTextEditor), { ssr: false });

const FormSchema = z.object({
  bibleBook: z.string({ required_error: "Por favor selecciona un libro."}).min(1, 'El libro es requerido.'),
  chapter: z.coerce.number().min(1, 'El capítulo es requerido.'),
  bibleVerse: z.string().min(1, 'La cita es requerida (ej. 1-5).'),
  verseText: z.string().min(10, 'El texto del versículo es requerido.'),
  observation: z.string().min(15, 'La observación es requerida.'),
  teaching: z.string().min(15, 'La enseñanza es requerida.'),
  practicalApplication: z.string().min(15, 'La aplicación práctica es requerida.'),
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

  const defaultFormValues: Partial<JournalFormValues> = {
    bibleBook: '',
    chapter: undefined,
    bibleVerse: '',
    verseText: '',
    observation: '',
    teaching: '',
    practicalApplication: '',
    tagIds: '',
  };

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: defaultFormValues,
  });
  
  // Efecto estándar de React Hook Form
  useEffect(() => {
    if (entry) {
      console.log('Cargando datos básicos...', entry);
      
      // 1. Lógica más segura para extraer solo los números del versículo
      // Si la cita es "Génesis 1:1-5", esto separa por ":" y toma lo último ("1-5")
      const parts = entry.bibleVerse.split(':');
      const verseOnly = parts.length > 1 ? parts[parts.length - 1] : '';

      // 2. Usamos setValue para forzar que cada campo tenga su dato
      form.setValue('bibleBook', entry.bibleBook || '');
      form.setValue('chapter', Number(entry.chapter)); // Aseguramos que sea número
      form.setValue('bibleVerse', verseOnly);
      form.setValue('verseText', entry.verseText || '');
      form.setValue('tagIds', entry.tagIds?.join(', ') || '');
      
      // También actualizamos el estado interno de los campos ricos
      form.setValue('observation', entry.observation || '');
      form.setValue('teaching', entry.teaching || '');
      form.setValue('practicalApplication', entry.practicalApplication || '');

    } else {
       // Si es nueva entrada, limpiar todo
       form.reset(defaultFormValues);
    }
  }, [entry, form.setValue, form.reset]);

  // --- SOLUCIÓN MANUAL DE INYECCIÓN ---
  useEffect(() => {
    if (entry) {
      // Esperamos un momento a que el editor se renderice
      const timer = setTimeout(() => {
        // Función auxiliar para inyectar texto
        const injectText = (containerId: string, text: string) => {
          const container = document.getElementById(containerId);
          if (container) {
            // Buscamos el div editable DENTRO de nuestro contenedor
            const editableDiv = container.querySelector('[contenteditable="true"]');
            if (editableDiv) {
              editableDiv.innerHTML = text;
            }
          }
        };

        if (entry.observation) injectText('wrapper-observation', entry.observation);
        if (entry.teaching) injectText('wrapper-teaching', entry.teaching);
        if (entry.practicalApplication) injectText('wrapper-application', entry.practicalApplication);
        
        console.log("Inyección manual completada.");
      }, 800); // 800ms de espera para asegurar carga

      return () => clearTimeout(timer);
    }
  }, [entry]);


  const onSubmit = (data: JournalFormValues) => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión.' });
        return;
    }

    // --- EXTRACCIÓN MANUAL DE DATOS (El "Puente" de Guardado) ---
    // Leemos directamente del HTML lo que el usuario escribió
    const getManualContent = (wrapperId: string, fallback: string) => {
        const wrapper = document.getElementById(wrapperId);
        const editable = wrapper?.querySelector('[contenteditable="true"]');
        // Si encontramos el div editable, devolvemos su HTML (lo que se ve). Si no, usamos el fallback.
        return editable ? editable.innerHTML : fallback;
    };

    // Sobrescribimos los datos del formulario con los visuales
    const finalObservation = getManualContent('wrapper-observation', data.observation);
    const finalTeaching = getManualContent('wrapper-teaching', data.teaching);
    const finalApplication = getManualContent('wrapper-application', data.practicalApplication);
    // ------------------------------------------------------------

    startTransition(() => {
        const tags = data.tagIds?.split(',').map(tag => tag.trim()).filter(tag => tag) || [];
        const fullBibleVerse = `${data.bibleBook} ${data.chapter}:${data.bibleVerse}`;
        
        // Usamos las variables "final..." que acabamos de leer
        const entryData = { 
            ...data, 
            bibleVerse: fullBibleVerse, 
            tagIds: tags,
            observation: finalObservation,        // <--- Dato visual real
            teaching: finalTeaching,              // <--- Dato visual real
            practicalApplication: finalApplication // <--- Dato visual real
        };

        if (isEditing && entry?.id) {
            const entryRef = doc(firestore, 'users', user.uid, 'journalEntries', entry.id);
            setDoc(entryRef, { ...entryData, updatedAt: Timestamp.now() }, { merge: true })
            .then(() => {
                toast({ title: 'Actualizado', description: 'Entrada guardada.' });
                if (onSave) onSave();
                router.refresh();
            })
            .catch((error) => {
                console.error("Error updating:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar.' });
            });
        } else {
            const entriesCollection = collection(firestore, 'users', user.uid, 'journalEntries');
            addDoc(entriesCollection, { ...entryData, createdAt: Timestamp.now() })
            .then(() => {
                toast({ title: 'Creado', description: 'Entrada guardada.' });
                if (onSave) onSave();
                else router.push(`/`);
            })
            .catch((error) => {
                console.error("Error creating:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear.' });
            });
        }
    });
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        <div className="grid grid-cols-1 sm:grid-cols-6 sm:gap-4 space-y-6 sm:space-y-0">
        <FormField
            control={form.control}
            name="bibleBook"
            render={({ field }) => (
                <FormItem className="sm:col-span-3">
                <FormLabel>Libro</FormLabel>
                {/* TRUCO: La 'key' obliga al componente a actualizarse cuando llega el dato */}
                <Select 
                    key={field.value} 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                >
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
            name="chapter"
            render={({ field }) => (
                <FormItem className="sm:col-span-1">
                <FormLabel>Capítulo</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="Ej: 23" {...field} value={field.value ?? ''}/>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            
            <FormField
            control={form.control}
            name="bibleVerse"
            render={({ field }) => (
                <FormItem className="sm:col-span-2">
                <FormLabel>Versículos</FormLabel>
                <FormControl>
                    <Input placeholder="Ej: 1-4" {...field} />
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

        {/* CAMPOS CON WRAPPER PARA INYECCIÓN MANUAL */}
        
        <FormField
            control={form.control}
            name="observation"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Observación (O - Observation)</FormLabel>
                <FormControl>
                {/* Wrapper ID para encontrarlo desde JS */}
                <div id="wrapper-observation">
                    <RichTextEditor
                        placeholder="¿Qué dice el texto?..."
                        {...field}
                    />
                </div>
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
                <div id="wrapper-teaching">
                    <RichTextEditor
                        placeholder="¿Qué verdad espiritual..."
                        {...field}
                    />
                </div>
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
                <div id="wrapper-application">
                    <RichTextEditor
                        placeholder="¿Cómo puedo poner por obra..."
                        {...field}
                    />
                </div>
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