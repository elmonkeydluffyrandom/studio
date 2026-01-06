'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState, useCallback } from 'react';
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
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, WifiOff, CheckCircle2, RefreshCw } from 'lucide-react';
import type { JournalEntry } from '@/lib/types';
import { useUser, useFirestore } from '@/firebase';
import { doc, addDoc, setDoc, Timestamp, collection } from 'firebase/firestore';
import { BIBLE_BOOKS } from '@/lib/bible-books';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FirebaseOffline } from '@/lib/firebaseOffline';

const FormSchema = z.object({
  bibleBook: z.string().min(1, 'El libro es requerido.'),
  chapter: z.coerce.number().min(1, 'El capítulo es requerido.'),
  bibleVerse: z.string().min(1, 'La cita es requerida.'),
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
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSaveInfo, setLastSaveInfo] = useState<{ time: Date; offline: boolean } | null>(null);
  
  const { user } = useUser();
  const firestore = useFirestore();
  const isEditing = !!entry;

  // Monitorear conexión y pendientes
  useEffect(() => {
    const updateStatus = async () => {
      const status = await FirebaseOffline.getConnectionStatus();
      setIsOnline(status.online);
      setPendingSyncCount(status.pendingEntries);
      
      if (!status.online && !isSaving) {
        toast({
          title: "📱 Modo offline",
          description: `Tus cambios se guardarán localmente (${status.pendingEntries} pendientes)`,
          duration: 5000,
        });
      }
    };

    updateStatus();
    
    const interval = setInterval(updateStatus, 10000); // Actualizar cada 10 segundos
    
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, [toast, isSaving]);

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      bibleBook: '',
      chapter: undefined,
      bibleVerse: '',
      verseText: '',
      observation: '',
      teaching: '',
      practicalApplication: '',
      tagIds: '',
    },
  });

  // Cargar datos
  useEffect(() => {
    if (entry) {
      const parts = entry.bibleVerse.split(':');
      const verseOnly = parts.length > 1 ? parts[parts.length - 1] : '';

      form.reset({
        bibleBook: entry.bibleBook || '',
        chapter: Number(entry.chapter) || undefined,
        bibleVerse: verseOnly,
        verseText: entry.verseText || '',
        tagIds: entry.tagIds?.join(', ') || '',
        observation: entry.observation || '',
        teaching: entry.teaching || '',
        practicalApplication: entry.practicalApplication || '',
      });
    }
  }, [entry, form]);

  // Sincronizar pendientes manualmente
  const syncPending = useCallback(async () => {
    if (!user || !firestore || pendingSyncCount === 0) return;

    setIsSaving(true);
    toast({
      title: "🔄 Sincronizando...",
      description: "Sincronizando cambios pendientes",
    });

    const result = await FirebaseOffline.syncPendingEntries(
      firestore,
      user.uid,
      (current, total) => {
        toast({
          title: `Sincronizando...`,
          description: `${current} de ${total} completados`,
        });
      }
    );

    setIsSaving(false);
    setPendingSyncCount(result.failed); // Actualizar con los fallidos restantes

    if (result.synced > 0) {
      toast({
        title: "✅ Sincronizado",
        description: `${result.synced} cambios sincronizados exitosamente`,
        duration: 4000,
      });
    }

    if (result.failed > 0) {
      toast({
        variant: "destructive",
        title: "⚠️ Sincronización parcial",
        description: `${result.failed} cambios no se pudieron sincronizar`,
        duration: 5000,
      });
    }
  }, [user, firestore, pendingSyncCount, toast]);

  // Función principal de guardado
  const handleSave = async (data: JournalFormValues) => {
    if (!user || !firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Usuario no autenticado",
      });
      return;
    }

    setIsSaving(true);

    try {
      const tags = data.tagIds?.split(',').map(tag => tag.trim()).filter(tag => tag) || [];
      const fullBibleVerse = `${data.bibleBook} ${data.chapter}:${data.bibleVerse}`;
      
      const entryData = {
        bibleBook: data.bibleBook,
        chapter: data.chapter,
        bibleVerse: fullBibleVerse,
        verseText: data.verseText,
        tagIds: tags,
        observation: data.observation,
        teaching: data.teaching,
        practicalApplication: data.practicalApplication,
        userId: user.uid,
        updatedAt: Timestamp.now()
      };

      // Preparar función de guardado para Firebase
      const saveFunction = async () => {
        if (isEditing && entry?.id) {
          const entryRef = doc(firestore, 'users', user.uid, 'journalEntries', entry.id);
          return await setDoc(entryRef, entryData, { merge: true });
        } else {
          const entriesCollection = collection(firestore, 'users', user.uid, 'journalEntries');
          return await addDoc(entriesCollection, { 
            ...entryData, 
            createdAt: Timestamp.now() 
          });
        }
      };

      // Usar el sistema offline
      const result = await FirebaseOffline.saveWithOfflineSupport(
        firestore,
        user.uid,
        saveFunction,
        entryData,
        entry?.id
      );

      // Actualizar estado
      setLastSaveInfo({
        time: new Date(),
        offline: result.offline
      });

      setPendingSyncCount(prev => result.offline ? prev + 1 : prev);

      // Mostrar mensaje apropiado
      if (result.offline) {
        toast({
          title: "📱 Guardado local",
          description: "Los cambios se guardaron en tu dispositivo. Se sincronizarán automáticamente.",
          duration: 6000,
        });
      } else {
        toast({
          title: "✅ ¡Guardado!",
          description: "Tu entrada se ha guardado exitosamente.",
          duration: 4000,
        });
      }

      // Si fue guardado exitoso y no es offline, refrescar
      if (result.success && !result.offline) {
        if (onSave) onSave();
        router.refresh();
      }

    } catch (error: any) {
      console.error("Error en guardado:", error);
      
      // Intentar guardar como último recurso
      try {
        const backupKey = `emergency_${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(data));
        
        toast({
          title: "⚠️ Guardado de emergencia",
          description: "Los cambios se guardaron localmente como precaución.",
          duration: 6000,
        });
        
        setLastSaveInfo({
          time: new Date(),
          offline: true
        });
        
      } catch (backupError) {
        toast({
          variant: "destructive",
          title: "❌ Error crítico",
          description: "No se pudo guardar. Intenta copiar tu contenido.",
          duration: 7000,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (data: JournalFormValues) => {
    await handleSave(data);
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Barra de estado */}
        <div className="flex flex-wrap justify-between items-center bg-muted/30 p-3 rounded-md mb-4 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Estado:</span>
            {isOnline ? (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3"/>
                En línea
              </span>
            ) : (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <WifiOff className="h-3 w-3"/>
                Offline
              </span>
            )}
          </div>
          
          {pendingSyncCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={syncPending}
              disabled={isSaving || !isOnline}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Sincronizar ({pendingSyncCount})
            </Button>
          )}
        </div>

        {/* Información del último guardado */}
        {lastSaveInfo && (
          <div className={`p-3 rounded-md ${lastSaveInfo.offline ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
            <p className={`text-sm ${lastSaveInfo.offline ? 'text-amber-800' : 'text-green-800'}`}>
              {lastSaveInfo.offline ? '📱 ' : '✅ '}
              Último guardado: {lastSaveInfo.time.toLocaleTimeString()} 
              {lastSaveInfo.offline ? ' (local)' : ''}
            </p>
          </div>
        )}

        {/* Campos del formulario */}
        <div className="grid grid-cols-1 sm:grid-cols-6 sm:gap-4 space-y-6 sm:space-y-0">
          <FormField
            control={form.control}
            name="bibleBook"
            render={({ field }) => (
              <FormItem className="sm:col-span-3">
                <FormLabel>Libro</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un libro" />
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
                  <Input 
                    type="number" 
                    placeholder="Ej: 23" 
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                  />
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
              <FormLabel>Texto del Versículo</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Escribe el texto del versículo..."
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
              <FormLabel>Observación</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="¿Qué dice el texto?..."
                  className="min-h-[100px]"
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
                <Textarea
                  placeholder="¿Qué verdad espiritual...?"
                  className="min-h-[100px]"
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
                <Textarea
                  placeholder="¿Cómo puedo poner por obra...?"
                  className="min-h-[100px]"
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
                <Input placeholder="Oración, Familia, Fe" {...field} />
              </FormControl>
              <FormDescription>Separa con comas</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col sm:flex-row justify-end gap-3 items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground mr-0 sm:mr-4">
            {isOnline ? '✅ Conectado' : '📱 Modo offline'}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving}
              className="flex-1 sm:flex-none"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isOnline ? 'Guardando...' : 'Guardando localmente...'}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing ? 'Guardar Cambios' : 'Crear Entrada'}
                  {!isOnline && " (Offline)"}
                </>
              )}
            </Button>
          </div>
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
        <CardTitle>{isEditing ? 'Editar Entrada' : 'Nueva Entrada'}</CardTitle>
        <CardDescription>
          Utiliza el método S.O.A.P para tu estudio bíblico.
          {!isOnline && " (Trabajando en modo offline)"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}