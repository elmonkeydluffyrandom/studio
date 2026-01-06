'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState, useCallback, useTransition } from 'react';
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
import { Loader2, Save, Cloud, CloudOff, CheckCircle2, Wifi, WifiOff } from 'lucide-react'; // Iconos añadidos
import type { JournalEntry } from '@/lib/types';
import { useUser, useFirestore } from '@/firebase';
import { doc, addDoc, setDoc, Timestamp, collection } from 'firebase/firestore';
import { BIBLE_BOOKS } from '@/lib/bible-books';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true); // ← Estado para conexión
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]); // ← Cola offline
  
  const { user } = useUser();
  const firestore = useFirestore();
  const isEditing = !!entry;

  // ← Detectar cambios en la conexión
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "✅ Conectado",
        description: "Ya tienes conexión a internet.",
        duration: 3000,
      });
      // Intentar sincronizar cola offline
      syncOfflineQueue();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        variant: "destructive",
        title: "⚠️ Sin conexión",
        description: "Estás en modo offline. Los cambios se guardarán localmente.",
        duration: 5000,
      });
    };

    setIsOnline(navigator.onLine);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // ← Sincronizar cola offline cuando vuelve la conexión
  const syncOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    if (queue.length === 0 || !user || !firestore) return;

    try {
      for (const item of queue) {
        if (item.type === 'update' && item.entryId) {
          const entryRef = doc(firestore, 'users', user.uid, 'journalEntries', item.entryId);
          await setDoc(entryRef, { ...item.data, updatedAt: Timestamp.now() }, { merge: true });
        } else if (item.type === 'create') {
          const entriesCollection = collection(firestore, 'users', user.uid, 'journalEntries');
          await addDoc(entriesCollection, { ...item.data, createdAt: Timestamp.now() });
        }
      }
      
      // Limpiar cola después de sincronizar
      localStorage.removeItem('offlineQueue');
      setOfflineQueue([]);
      
      toast({
        title: "🔄 Sincronizado",
        description: `Se sincronizaron ${queue.length} cambios pendientes.`,
        duration: 4000,
      });
      
    } catch (error) {
      console.error("Error sincronizando cola offline:", error);
    }
  };

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

  // Vigilar cambios para el autoguardado
  const watchedValues = useWatch({ control: form.control });

  // 1. Carga de datos iniciales
  useEffect(() => {
    if (entry) {
      const parts = entry.bibleVerse.split(':');
      const verseOnly = parts.length > 1 ? parts[parts.length - 1] : '';

      form.setValue('bibleBook', entry.bibleBook || '');
      form.setValue('chapter', Number(entry.chapter));
      form.setValue('bibleVerse', verseOnly);
      form.setValue('verseText', entry.verseText || '');
      form.setValue('tagIds', entry.tagIds?.join(', ') || '');
      
      form.setValue('observation', entry.observation || '');
      form.setValue('teaching', entry.teaching || '');
      form.setValue('practicalApplication', entry.practicalApplication || '');
    }
  }, [entry, form.setValue]);

  // 2. Inyección Manual (Para ver los datos al cargar)
  useEffect(() => {
    if (entry) {
      const timer = setTimeout(() => {
        const injectText = (containerId: string, text: string) => {
          const container = document.getElementById(containerId);
          if (container) {
            const editableDiv = container.querySelector('[contenteditable="true"]');
            if (editableDiv) editableDiv.innerHTML = text;
          }
        };

        if (entry.observation) injectText('wrapper-observation', entry.observation);
        if (entry.teaching) injectText('wrapper-teaching', entry.teaching);
        if (entry.practicalApplication) injectText('wrapper-application', entry.practicalApplication);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [entry]);


  // --- LÓGICA CENTRAL DE GUARDADO MEJORADA (Con soporte offline) ---
  const performSave = useCallback(async (data: JournalFormValues, isAutoSave: boolean = false) => {
    if (!user || !firestore) return;

    // Extracción Manual del HTML (Lo que ves es lo que guardas)
    const getManualContent = (wrapperId: string, fallback: string) => {
        const wrapper = document.getElementById(wrapperId);
        const editable = wrapper?.querySelector('[contenteditable="true"]');
        return editable ? editable.innerHTML : fallback;
    };

    const finalObservation = getManualContent('wrapper-observation', data.observation);
    const finalTeaching = getManualContent('wrapper-teaching', data.teaching);
    const finalApplication = getManualContent('wrapper-application', data.practicalApplication);

    const tags = data.tagIds?.split(',').map(tag => tag.trim()).filter(tag => tag) || [];
    const fullBibleVerse = `${data.bibleBook} ${data.chapter}:${data.bibleVerse}`;
    
    const entryData = { 
        ...data, 
        bibleVerse: fullBibleVerse, 
        tagIds: tags,
        observation: finalObservation,
        teaching: finalTeaching,
        practicalApplication: finalApplication
    };

    try {
        setSaveStatus('saving');
        
        // ← VERIFICACIÓN DE CONEXIÓN
        if (!navigator.onLine) {
          throw new Error('OFFLINE_MODE');
        }

        // ← TIMEOUT para evitar que se quede colgado
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('TIMEOUT')), 8000); // 8 segundos máximo
        });

        if (isEditing && entry?.id) {
            const entryRef = doc(firestore, 'users', user.uid, 'journalEntries', entry.id);
            await Promise.race([
              setDoc(entryRef, { ...entryData, updatedAt: Timestamp.now() }, { merge: true }),
              timeoutPromise
            ]);
        } else {
            // Si es nueva, no podemos autoguardar hasta que se cree la primera vez manualmente
            if (isAutoSave && !entry?.id) {
                setSaveStatus('idle');
                return; 
            }
            const entriesCollection = collection(firestore, 'users', user.uid, 'journalEntries');
            await Promise.race([
              addDoc(entriesCollection, { ...entryData, createdAt: Timestamp.now() }),
              timeoutPromise
            ]);
        }

        setSaveStatus('saved');
        setLastSavedTime(new Date());

        // Solo mostramos Toast si fue clic manual, para no spamear en autoguardado
        if (!isAutoSave) {
            toast({ 
              title: '✅ ¡Guardado!', 
              description: 'Tu entrada se ha actualizado exitosamente.' 
            });
            if (onSave) onSave();
            router.refresh();
        }

    } catch (error: any) {
        console.error("Error saving:", error);
        
        // ← MANEJO DE ERRORES OFFLINE
        if (error.message === 'OFFLINE_MODE' || error.message === 'TIMEOUT') {
            // Guardar en cola offline
            const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
            
            const offlineItem = {
              type: isEditing && entry?.id ? 'update' : 'create',
              entryId: entry?.id,
              data: entryData,
              timestamp: Date.now(),
            };
            
            queue.push(offlineItem);
            localStorage.setItem('offlineQueue', JSON.stringify(queue));
            setOfflineQueue(queue);
            
            setSaveStatus('saved');
            setLastSavedTime(new Date());
            
            if (!isAutoSave) {
              toast({ 
                title: '📱 Guardado offline', 
                description: 'Los cambios se guardaron localmente. Se sincronizarán cuando tengas conexión.',
                duration: 5000,
              });
              if (onSave) onSave();
              router.refresh();
            }
            return;
        }
        
        // ← ERRORES DE RED NORMALES
        setSaveStatus('error');
        if (!isAutoSave) {
            toast({ 
              variant: 'destructive', 
              title: '❌ Error', 
              description: 'No se pudo guardar. Revisa tu conexión.' 
            });
        }
    }
  }, [user, firestore, isEditing, entry, onSave, router, toast]);


  // --- AUTOGUARDADO (Debounce) ---
  useEffect(() => {
    if (!isEditing) return; 

    const timer = setTimeout(() => {
        const currentValues = form.getValues();
        if (currentValues.bibleBook && currentValues.chapter) {
            performSave(currentValues, true);
        }
    }, 3000);

    return () => clearTimeout(timer);
  }, [watchedValues, isEditing, performSave, form]);


  // Envío Manual (Botón)
  const onSubmit = (data: JournalFormValues) => {
    startTransition(() => {
        performSave(data, false);
    });
  };

  // Componente visual de estado MEJORADO
  const StatusIndicator = () => {
    if (!isOnline) {
        return (
          <span className="text-xs text-amber-600 flex items-center gap-1">
            <WifiOff className="h-3 w-3"/>
            Offline ({offlineQueue.length} pendientes)
          </span>
        );
    }
    
    if (saveStatus === 'saving') {
        return <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/> Guardando...</span>;
    }
    if (saveStatus === 'saved') {
        return <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Guardado {lastSavedTime?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>;
    }
    if (saveStatus === 'error') {
        return <span className="text-xs text-red-500 flex items-center gap-1"><CloudOff className="h-3 w-3"/> Error al guardar</span>;
    }
    return <span className="text-xs text-green-600 flex items-center gap-1"><Wifi className="h-3 w-3"/> En línea</span>;
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Barra de estado superior MEJORADA */}
        <div className="flex justify-between items-center bg-muted/30 p-2 rounded-md mb-4">
             <span className="text-xs font-medium text-muted-foreground">Estado de sincronización:</span>
             <StatusIndicator />
        </div>

        {/* ← Mostrar advertencia offline */}
        {!isOnline && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-amber-800 text-sm font-medium flex items-center gap-2">
              <WifiOff className="h-4 w-4" />
              Modo offline: Los cambios se guardan localmente y se sincronizarán automáticamente cuando recuperes la conexión.
            </p>
            {offlineQueue.length > 0 && (
              <p className="text-amber-700 text-xs mt-1">
                Tienes {offlineQueue.length} cambio(s) pendientes de sincronizar.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-6 sm:gap-4 space-y-6 sm:space-y-0">
            <FormField
            control={form.control}
            name="bibleBook"
            render={({ field }) => (
                <FormItem className="sm:col-span-3">
                <FormLabel>Libro</FormLabel>
                <Select key={field.value} onValueChange={field.onChange} defaultValue={field.value}>
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

        {/* CAMPOS RICOS */}
        
        <FormField
            control={form.control}
            name="observation"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Observación (O - Observation)</FormLabel>
                <FormControl>
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

        <div className="flex justify-end gap-2 items-center">
            {/* Indicador también cerca del botón */}
            <div className="mr-4 hidden sm:block">
                <StatusIndicator />
            </div>

            {isModal ? (
                <Button type="button" variant="outline" onClick={onSave}>
                    Cancelar
                </Button>
            ) : (
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                </Button>
            )}
            <Button 
              type="submit" 
              disabled={isPending || saveStatus === 'saving'} 
              className="w-full sm:w-auto"
            >
              {isPending || saveStatus === 'saving' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isEditing ? 'Guardar Cambios' : 'Crear Entrada'}
              {!isOnline && " (Offline)"}
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