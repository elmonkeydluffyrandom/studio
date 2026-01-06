'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState, useCallback } from 'react';
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
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, WifiOff, CheckCircle2, RefreshCw, BookOpen } from 'lucide-react';
import type { JournalEntry } from '@/lib/types';
import { useUser, useFirestore } from '@/firebase';
import { doc, addDoc, setDoc, Timestamp, collection } from 'firebase/firestore';
import { BIBLE_BOOKS } from '@/lib/bible-books';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import OfflineStorage from '@/lib/offlineStorage';

// Carga dinámica del editor rico
const RichTextEditor = dynamic(() => import('../rich-text-editor').then((mod) => mod.RichTextEditor), {
  ssr: false,
  loading: () => <div className="border rounded-md p-4 min-h-[150px] bg-muted animate-pulse" />
});

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

// Función para normalizar contenido HTML del editor
const normalizeEditorContent = (content: string | undefined): string => {
  if (!content) return '<p></p>';
  
  // Si ya es HTML, devolverlo
  if (content.includes('<') && content.includes('>')) {
    // Asegurar que tenga un párrafo contenedor
    const trimmed = content.trim();
    if (!trimmed.startsWith('<')) {
      return `<p>${content}</p>`;
    }
    return content;
  }
  
  // Si es texto plano, convertirlo a HTML
  if (content.trim().length > 0) {
    return `<p>${content.replace(/\n/g, '<br>')}</p>`;
  }
  
  return '<p></p>';
};

export default function JournalForm({ entry, onSave, isModal = false }: JournalFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { user } = useUser();
  const firestore = useFirestore();
  const isEditing = !!entry;

  // Detectar conexión en tiempo real
  useEffect(() => {
    const updateOnlineStatus = async () => {
      const online = await OfflineStorage.checkRealConnection();
      setIsOnline(online);
      
      if (!online) {
        toast({
          title: "📱 Modo offline",
          description: "Trabajando sin conexión",
          duration: 3000,
        });
      }
    };

    updateOnlineStatus();
    
    const handleOnline = () => updateOnlineStatus();
    const handleOffline = () => updateOnlineStatus();
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Actualizar contador de pendientes
    if (user) {
      const pending = OfflineStorage.getPendingEntries(user.uid);
      setPendingCount(pending.length);
    }
    
    // Limpiar viejos
    OfflineStorage.cleanupOldEntries();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast, user]);

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

  // Cargar datos iniciales - VERSIÓN MEJORADA con normalización
  useEffect(() => {
    if (entry) {
      console.log('📖 Cargando entrada para editar:', {
        id: entry.id,
        observationRaw: entry.observation?.substring(0, 100),
        teachingRaw: entry.teaching?.substring(0, 100),
        practicalAppRaw: entry.practicalApplication?.substring(0, 100),
      });
      
      const parts = (entry.bibleVerse || '').split(':');
      const verseOnly = parts.length > 1 ? parts[parts.length - 1] : entry.bibleVerse || '';

      // Normalizar contenido HTML antes de cargar
      const normalizedObservation = normalizeEditorContent(entry.observation);
      const normalizedTeaching = normalizeEditorContent(entry.teaching);
      const normalizedPracticalApp = normalizeEditorContent(entry.practicalApplication);

      // RESET con valores normalizados
      form.reset({
        bibleBook: entry.bibleBook || '',
        chapter: Number(entry.chapter) || undefined,
        bibleVerse: verseOnly,
        verseText: entry.verseText || '',
        tagIds: entry.tagIds?.join(', ') || '',
        
        // CONTENIDO NORMALIZADO
        observation: normalizedObservation,
        teaching: normalizedTeaching,
        practicalApplication: normalizedPracticalApp,
      });
      
      console.log('✅ Formulario cargado con contenido normalizado:', {
        book: entry.bibleBook,
        chapter: entry.chapter,
        observationNormalized: normalizedObservation.substring(0, 100),
        teachingNormalized: normalizedTeaching.substring(0, 100),
      });
      
      // Debug adicional después de un momento
      setTimeout(() => {
        console.log('🔍 Valores después de reset:', {
          observation: form.getValues('observation')?.substring(0, 100),
          teaching: form.getValues('teaching')?.substring(0, 100),
        });
      }, 500);
    }
  }, [entry, form]);

  // Detectar cambios para auto-guardado offline
  const watchedValues = useWatch({ control: form.control });
  
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [watchedValues]);

  // Sincronizar pendientes
  const syncPending = useCallback(async () => {
    if (!user || !firestore || pendingCount === 0) return;

    setIsSaving(true);
    
    toast({
      title: "🔄 Sincronizando...",
      description: `Sincronizando ${pendingCount} cambios pendientes`,
    });

    try {
      const pendingEntries = OfflineStorage.getPendingEntries(user.uid);
      let synced = 0;
      let failed = 0;

      for (const pending of pendingEntries) {
        try {
          // Normalizar contenido antes de sincronizar
          const normalizedData = {
            ...pending.data,
            observation: normalizeEditorContent(pending.data.observation),
            teaching: normalizeEditorContent(pending.data.teaching),
            practicalApplication: normalizeEditorContent(pending.data.practicalApplication),
          };

          if (pending.type === 'update' && pending.data.id) {
            const entryRef = doc(firestore, 'users', user.uid, 'journalEntries', pending.data.id);
            await setDoc(entryRef, {
              ...normalizedData,
              updatedAt: Timestamp.now(),
              _syncedFromOffline: true
            }, { merge: true });
          } else if (pending.type === 'create') {
            const entriesCollection = collection(firestore, 'users', user.uid, 'journalEntries');
            await addDoc(entriesCollection, {
              ...normalizedData,
              createdAt: Timestamp.now(),
              _syncedFromOffline: true
            });
          }
          
          OfflineStorage.markAsSynced(pending.id);
          synced++;
          
        } catch (error) {
          console.error('Error sincronizando:', error);
          OfflineStorage.markAsFailed(pending.id);
          failed++;
        }
      }

      const newPending = OfflineStorage.getPendingEntries(user.uid);
      setPendingCount(newPending.length);

      if (synced > 0) {
        toast({
          title: "✅ Sincronizado",
          description: `${synced} cambios sincronizados exitosamente`,
          duration: 4000,
        });
        
        // Recargar la página para ver cambios
        setTimeout(() => {
          router.refresh();
        }, 1000);
      }

      if (failed > 0) {
        toast({
          variant: "destructive",
          title: "⚠️ Algunos cambios fallaron",
          description: `${failed} cambios no se pudieron sincronizar`,
          duration: 5000,
        });
      }

    } catch (error) {
      console.error('Error general sincronizando:', error);
      toast({
        variant: "destructive",
        title: "❌ Error de sincronización",
        description: "No se pudo completar la sincronización",
      });
    } finally {
      setIsSaving(false);
    }
  }, [user, firestore, pendingCount, toast, router]);

  // Función de guardado PRINCIPAL - VERSIÓN MEJORADA
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

    try {
      // Preparar datos con contenido normalizado
      const tags = data.tagIds?.split(',').map(tag => tag.trim()).filter(tag => tag) || [];
      const fullBibleVerse = `${data.bibleBook} ${data.chapter}:${data.bibleVerse}`;
      
      // Normalizar contenido HTML antes de guardar
      const normalizedObservation = normalizeEditorContent(data.observation);
      const normalizedTeaching = normalizeEditorContent(data.teaching);
      const normalizedPracticalApp = normalizeEditorContent(data.practicalApplication);
      
      const entryData = {
        bibleBook: data.bibleBook,
        chapter: data.chapter,
        bibleVerse: fullBibleVerse,
        verseText: data.verseText,
        tagIds: tags,
        
        // CONTENIDO NORMALIZADO
        observation: normalizedObservation,
        teaching: normalizedTeaching,
        practicalApplication: normalizedPracticalApp,
        
        userId: user.uid,
        updatedAt: Timestamp.now()
      };

      // Debug: mostrar datos que se van a guardar
      console.log('💾 Datos preparados para guardar:', {
        observation: entryData.observation?.substring(0, 100),
        teaching: entryData.teaching?.substring(0, 100),
        isHTML: {
          obs: entryData.observation?.includes('<'),
          teach: entryData.teaching?.includes('<')
        }
      });

      const isConnected = await OfflineStorage.checkRealConnection();
      
      if (!isConnected) {
        // 🔥 MODO OFFLINE: Guardar en localStorage
        console.log('📴 Guardando en modo offline...');
        
        // Usar saveEntryEnhanced que maneja mejor la serialización
        const offlineId = OfflineStorage.saveEntryEnhanced({
          id: entry?.id || '',
          type: isEditing ? 'update' : 'create',
          data: entryData,
          userId: user.uid
        });
        
        // GUARDADO DE EMERGENCIA EXTRA
        OfflineStorage.forceSave(`emergency_${Date.now()}`, entryData);
        
        // Actualizar contador
        const newPending = OfflineStorage.getPendingEntries(user.uid);
        setPendingCount(newPending.length);
        
        // Marcar que ya no hay cambios sin guardar
        setHasUnsavedChanges(false);
        
        // Mostrar mensaje OFFLINE
        toast({
          title: "📱 Guardado offline exitoso",
          description: "Los cambios se guardaron en tu dispositivo.",
          duration: 5000,
        });
        
        // NO REDIRIGIR INMEDIATAMENTE - dar opción
        setTimeout(() => {
          toast({
            title: "¿Qué deseas hacer?",
            description: "Tus cambios están guardados localmente",
            duration: 8000,
            action: (
              <div className="flex flex-col gap-2 mt-2">
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={() => {
                    // Mantener en la misma página
                    form.reset();
                    setHasUnsavedChanges(false);
                  }}
                >
                  Crear otra entrada
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/journal')}
                >
                  Ver todas las entradas
                </Button>
              </div>
            ),
          });
        }, 1000);
        
        setIsSaving(false);
        return { success: true, offline: true };
      }

      // 🔥 MODO ONLINE: Guardar en Firebase
      console.log('🟢 Guardando en Firebase...');
      
      try {
        if (isEditing && entry?.id) {
          const entryRef = doc(firestore, 'users', user.uid, 'journalEntries', entry.id);
          await setDoc(entryRef, entryData, { merge: true });
        } else {
          const entriesCollection = collection(firestore, 'users', user.uid, 'journalEntries');
          await addDoc(entriesCollection, { 
            ...entryData, 
            createdAt: Timestamp.now() 
          });
        }
        
        // Éxito online
        toast({
          title: "✅ ¡Guardado!",
          description: "Tu entrada se ha guardado exitosamente.",
          duration: 4000,
        });
        
        // Esperar y redirigir
        setTimeout(() => {
          if (onSave) onSave();
          if (!isModal) {
            router.push('/journal');
          }
        }, 1500);
        
        setIsSaving(false);
        return { success: true, offline: false };
        
      } catch (firebaseError) {
        console.error('Error Firebase:', firebaseError);
        
        // Si Firebase falla, guardar offline
        const offlineId = OfflineStorage.saveEntryEnhanced({
          id: entry?.id || '',
          type: isEditing ? 'update' : 'create',
          data: entryData,
          userId: user.uid
        });
        
        setPendingCount(prev => prev + 1);
        
        toast({
          title: "⚠️ Guardado local",
          description: "Se guardó localmente por error de conexión.",
          duration: 5000,
        });
        
        setIsSaving(false);
        return { success: true, offline: true };
      }

    } catch (error: any) {
      console.error("❌ Error crítico en handleSave:", error);
      
      // ÚLTIMO RECURSO: Guardar en localStorage simple
      try {
        localStorage.setItem(`last_resort_${Date.now()}`, JSON.stringify({
          formData: data,
          timestamp: Date.now(),
          userId: user?.uid
        }));
        
        toast({
          title: "🆘 Guardado de emergencia",
          description: "Los cambios se guardaron como precaución.",
          duration: 6000,
        });
        
        setIsSaving(false);
        return { success: true, offline: true };
        
      } catch (emergencyError) {
        toast({
          variant: "destructive",
          title: "❌ Error crítico",
          description: "No se pudo guardar. Copia tu contenido.",
          duration: 7000,
        });
        
        setIsSaving(false);
        return { success: false, offline: false };
      }
    }
  };

  const onSubmit = async (data: JournalFormValues) => {
    await handleSave(data);
  };

  // Componente de estado
  const StatusIndicator = () => {
    if (isSaving) {
      return (
        <span className="text-xs text-blue-600 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin"/>
          {isOnline ? 'Guardando...' : 'Guardando offline...'}
        </span>
      );
    }
    
    if (!isOnline) {
      return (
        <span className="text-xs text-amber-600 flex items-center gap-1">
          <WifiOff className="h-3 w-3"/>
          Offline
        </span>
      );
    }
    
    return (
      <span className="text-xs text-green-600 flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3"/>
        En línea
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
            <span className="text-sm font-medium text-muted-foreground">
              {isEditing ? 'Editar Entrada' : 'Nueva Entrada'}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <StatusIndicator />
            
            {pendingCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-600">
                  {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
                </span>
                {isOnline && (
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
            )}
          </div>
        </div>

        {/* Campos del formulario */}
        <div className="grid grid-cols-1 sm:grid-cols-6 sm:gap-4 space-y-6 sm:space-y-0">
          <FormField
            control={form.control}
            name="bibleBook"
            render={({ field }) => (
              <FormItem className="sm:col-span-3">
                <FormLabel>Libro *</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un libro">
                        {field.value ? field.value : "Selecciona un libro"}
                      </SelectValue>
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
                <div className="min-h-[150px]">
                  <RichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="¿Qué dice el texto?..."
                  />
                </div>
              </FormControl>
              <FormDescription className="text-xs text-muted-foreground">
                Puedes usar negrita, cursiva y listas en el editor
              </FormDescription>
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
                <div className="min-h-[150px]">
                  <RichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="¿Qué verdad espiritual...?"
                  />
                </div>
              </FormControl>
              <FormDescription className="text-xs text-muted-foreground">
                Usa el editor para formatear tu enseñanza
              </FormDescription>
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
                <div className="min-h-[150px]">
                  <RichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="¿Cómo puedo poner por obra...?"
                  />
                </div>
              </FormControl>
              <FormDescription className="text-xs text-muted-foreground">
                Formatea tu aplicación práctica
              </FormDescription>
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
            {pendingCount > 0 && ` • ${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''}`}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (confirm('¿Salir sin guardar los cambios?')) {
                    router.push('/journal');
                  }
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