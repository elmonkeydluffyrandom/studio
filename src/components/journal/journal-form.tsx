'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState, useCallback, useRef } from 'react';
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
import { Loader2, Save, WifiOff, CheckCircle2, RefreshCw, AlertCircle, BookOpen } from 'lucide-react';
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
  const [saveHistory, setSaveHistory] = useState<Array<{time: Date; offline: boolean; success: boolean}>>([]);
  
  const { user } = useUser();
  const firestore = useFirestore();
  const isEditing = !!entry;
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detectar conexión
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('✅ Conexión restablecida');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log('📴 Sin conexión');
    };

    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Verificar pendientes periódicamente
  useEffect(() => {
    const checkPending = () => {
      if (typeof window !== 'undefined') {
        try {
          const pendingData = localStorage.getItem('journal_pending_sync');
          const pending = pendingData ? JSON.parse(pendingData) : [];
          setPendingSyncCount(pending.length);
        } catch (error) {
          console.error('Error checking pending:', error);
        }
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 10000);
    
    return () => clearInterval(interval);
  }, []);

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
      const parts = entry.bibleVerse?.split(':') || [];
      const verseOnly = parts.length > 1 ? parts[parts.length - 1] : entry.bibleVerse || '';

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

  // Sincronizar pendientes
  const syncPending = useCallback(async () => {
    if (!user || !firestore || pendingSyncCount === 0) return;

    setIsSaving(true);
    
    toast({
      title: "🔄 Sincronizando...",
      description: `Sincronizando ${pendingSyncCount} cambios pendientes`,
    });

    try {
      const result = await FirebaseOffline.syncPendingEntries(
        firestore,
        user.uid,
        (current, total) => {
          console.log(`Progreso: ${current}/${total}`);
        }
      );

      setPendingSyncCount(result.failed);

      if (result.synced > 0) {
        toast({
          title: "✅ Sincronizado",
          description: `${result.synced} cambios sincronizados exitosamente`,
          duration: 4000,
        });
        
        // Agregar al historial
        setSaveHistory(prev => [...prev, {
          time: new Date(),
          offline: false,
          success: true
        }]);
      }

      if (result.failed > 0) {
        toast({
          variant: "destructive",
          title: "⚠️ Sincronización parcial",
          description: `${result.failed} cambios no se pudieron sincronizar`,
          duration: 5000,
        });
      }

    } catch (error) {
      console.error('Error sincronizando:', error);
      toast({
        variant: "destructive",
        title: "❌ Error",
        description: "No se pudo completar la sincronización",
      });
    } finally {
      setIsSaving(false);
    }
  }, [user, firestore, pendingSyncCount, toast]);

  // Función principal de guardado - FIXED
  const handleSave = async (data: JournalFormValues): Promise<{success: boolean; offline: boolean}> => {
    if (!user || !firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Usuario no autenticado",
      });
      return { success: false, offline: false };
    }

    setIsSaving(true);

    return new Promise((resolve) => {
      try {
        // Preparar datos
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

        // Preparar función de guardado
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

        // Usar callback para manejar resultado
        FirebaseOffline.saveEntryWithCallback(
          firestore,
          user.uid,
          saveFunction,
          entryData,
          entry?.id,
          (result) => {
            // AGREGAR AL HISTORIAL
            setSaveHistory(prev => [...prev, {
              time: new Date(),
              offline: result.offline,
              success: result.success
            }]);

            // ACTUALIZAR CONTADOR
            if (result.offline) {
              setPendingSyncCount(prev => prev + 1);
            }

            // MOSTRAR MENSAJE
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

            setIsSaving(false);
            resolve({ success: result.success, offline: result.offline });

            // SOLO REDIRIGIR SI ES ONLINE Y ÉXITO
            if (result.success && !result.offline) {
              // Pequeño delay antes de redirigir
              setTimeout(() => {
                if (onSave) onSave();
                if (!isModal) {
                  router.push('/journal');
                }
              }, 1500);
            }
          },
          (error) => {
            console.error('Error en callback:', error);
            
            // Guardado de emergencia
            const emergencyKey = `emergency_${Date.now()}`;
            localStorage.setItem(emergencyKey, JSON.stringify({
              formData: data,
              timestamp: Date.now(),
              error: error.message
            }));
            
            toast({
              title: "⚠️ Guardado de emergencia",
              description: "Los cambios se guardaron localmente como precaución.",
              duration: 6000,
            });
            
            setSaveHistory(prev => [...prev, {
              time: new Date(),
              offline: true,
              success: true
            }]);
            
            setIsSaving(false);
            resolve({ success: true, offline: true });
          }
        );

      } catch (error: any) {
        console.error("Error en handleSave:", error);
        
        toast({
          variant: "destructive",
          title: "❌ Error crítico",
          description: "No se pudo guardar. Intenta copiar tu contenido.",
          duration: 7000,
        });
        
        setIsSaving(false);
        resolve({ success: false, offline: false });
      }
    });
  };

  const onSubmit = async (data: JournalFormValues) => {
    // Limpiar timeout anterior
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const result = await handleSave(data);
    
    // Si es offline, NO redirigir inmediatamente
    if (result.offline && !isModal) {
      // Esperar 3 segundos antes de mostrar opción de volver
      saveTimeoutRef.current = setTimeout(() => {
        toast({
          title: "¿Qué quieres hacer?",
          description: "Los cambios se guardaron localmente.",
          duration: 8000,
          action: (
            <div className="flex gap-2 mt-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => router.push('/journal')}
              >
                Ver entradas
              </Button>
              <Button 
                size="sm"
                onClick={() => window.location.reload()}
              >
                Seguir editando
              </Button>
            </div>
          ),
        });
      }, 3000);
    }
  };

  // Componente de estado
  const StatusIndicator = () => {
    if (isSaving) {
      return (
        <span className="text-xs text-blue-600 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin"/>
          {isOnline ? 'Guardando...' : 'Guardando localmente...'}
        </span>
      );
    }
    
    if (!isOnline) {
      return (
        <span className="text-xs text-amber-600 flex items-center gap-1">
          <WifiOff className="h-3 w-3"/>
          Offline {pendingSyncCount > 0 && `(${pendingSyncCount} pendientes)`}
        </span>
      );
    }
    
    return (
      <span className="text-xs text-green-600 flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3"/>
        En línea {pendingSyncCount > 0 && `(${pendingSyncCount} pendientes)`}
      </span>
    );
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Barra de estado */}
        <div className="flex flex-wrap justify-between items-center bg-muted/30 p-3 rounded-md mb-4 gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Diario Bíblico</span>
          </div>
          
          <div className="flex items-center gap-4">
            <StatusIndicator />
            
            {pendingSyncCount > 0 && isOnline && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={syncPending}
                disabled={isSaving}
                className="text-xs h-7"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Sincronizar
              </Button>
            )}
          </div>
        </div>

        {/* Historial reciente */}
        {saveHistory.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              📋 Historial: {saveHistory.filter(s => s.success).length} guardados exitosos
              {saveHistory.filter(s => s.offline).length > 0 && 
                ` (${saveHistory.filter(s => s.offline).length} offline)`}
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
                <FormLabel>Libro *</FormLabel>
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
                <FormLabel>Capítulo *</FormLabel>
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
                <FormLabel>Versículos *</FormLabel>
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
              <FormLabel>Texto del Versículo *</FormLabel>
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
              <FormLabel>Observación (O - Observation) *</FormLabel>
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
              <FormLabel>Enseñanza *</FormLabel>
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
              <FormLabel>Aplicación Práctica *</FormLabel>
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

        <div className="flex flex-col sm:flex-row justify-end gap-3 items-center pt-6 border-t">
          <div className="text-sm text-muted-foreground mr-0 sm:mr-4">
            {isOnline ? '✅ Conectado' : '📱 Modo offline'}
            {pendingSyncCount > 0 && ` • ${pendingSyncCount} pendientes`}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                if (isModal && onSave) {
                  onSave();
                } else {
                  router.push('/journal');
                }
              }}
              className="flex-1 sm:flex-none"
              disabled={isSaving}
            >
              {isModal ? 'Cancelar' : 'Volver'}
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving}
              className="flex-1 sm:flex-none"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isOnline ? 'Guardando...' : 'Guardando local...'}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing ? 'Guardar Cambios' : 'Crear Entrada'}
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
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          {isEditing ? 'Editar Entrada' : 'Nueva Entrada'}
        </CardTitle>
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