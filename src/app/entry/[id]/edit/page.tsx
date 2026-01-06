'use client';

import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { JournalEntry } from '@/lib/types';
import { normalizeJournalEntry } from '@/lib/types'; // ¡CREA ESTA FUNCIÓN!
import Login from '@/components/auth/login';
import JournalForm from '@/components/journal/journal-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function EditEntryPage() {
  const { id } = useParams();
  const entryId = Array.isArray(id) ? id[0] : id;
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [entryData, setEntryData] = useState<JournalEntry | null>(null);
  const { toast } = useToast();

  const entryRef = useMemoFirebase(
    () => (user && firestore && entryId ? doc(firestore, 'users', user.uid, 'journalEntries', entryId) : null),
    [user, firestore, entryId]
  );

  const { data: rawEntry, isLoading: isEntryLoading } = useDoc<JournalEntry>(entryRef);

  // 🔥 CORRECCIÓN CLAVE: Normalizar los datos de Firestore
  useEffect(() => {
    if (rawEntry && entryId) {
      console.log('📥 Datos CRUDOS de Firestore:', {
        observation: rawEntry.observation ? `✅ (${rawEntry.observation.length} chars)` : '❌',
        teaching: rawEntry.teaching ? `✅ (${rawEntry.teaching.length} chars)` : '❌',
        practicalApplication: rawEntry.practicalApplication ? `✅ (${rawEntry.practicalApplication.length} chars)` : '❌',
        observacion: rawEntry.observacion ? `✅ (${rawEntry.observacion.length} chars)` : '❌',
        ensenanza: rawEntry.ensenanza ? `✅ (${rawEntry.ensenanza.length} chars)` : '❌',
        aplicacion: rawEntry.aplicacion ? `✅ (${rawEntry.aplicacion.length} chars)` : '❌',
      });

      // Normalizar los datos para que JournalForm los entienda
      const normalizedEntry = {
        ...rawEntry,
        id: entryId,
        userId: rawEntry.userId || user?.uid || '',
        
        // 📌 Asegurar que JournalForm reciba los campos en el formato que espera
        // JournalForm espera: observation, teaching, practicalApplication
        // Pero también mantiene compatibilidad con los nombres viejos
        observation: rawEntry.observation || rawEntry.observacion || '',
        teaching: rawEntry.teaching || rawEntry.ensenanza || '',
        practicalApplication: rawEntry.practicalApplication || rawEntry.aplicacion || rawEntry.practica || '',
        
        // Mantener los campos viejos para compatibilidad inversa
        observacion: rawEntry.observacion || rawEntry.observation || '',
        ensenanza: rawEntry.ensenanza || rawEntry.teaching || '',
        aplicacion: rawEntry.aplicacion || rawEntry.practica || rawEntry.practicalApplication || '',
        practica: rawEntry.practica || rawEntry.practicalApplication || '',
      };

      console.log('📤 Datos NORMALIZADOS para JournalForm:', {
        observation: normalizedEntry.observation ? `✅ (${normalizedEntry.observation.length} chars)` : '❌',
        teaching: normalizedEntry.teaching ? `✅ (${normalizedEntry.teaching.length} chars)` : '❌',
        practicalApplication: normalizedEntry.practicalApplication ? `✅ (${normalizedEntry.practicalApplication.length} chars)` : '❌',
      });

      setEntryData(normalizedEntry);
    }
  }, [rawEntry, entryId, user?.uid]);

  // Cargar desde localStorage si Firestore falla
  useEffect(() => {
    if (!rawEntry && entryId && !isEntryLoading && user) {
      try {
        const offlineKey = `entry_${user.uid}_${entryId}`;
        const offlineData = localStorage.getItem(offlineKey);
        
        if (offlineData) {
          const localData = JSON.parse(offlineData);
          console.log('📂 Cargando desde localStorage:', localData);
          setEntryData(localData);
          
          toast({
            title: 'Usando datos locales',
            description: 'Conexión limitada - mostrando versión guardada',
            variant: 'default',
          });
        }
      } catch (error) {
        console.error('Error cargando desde localStorage:', error);
      }
    }
  }, [rawEntry, entryId, isEntryLoading, user, toast]);

  if (isUserLoading || (entryRef && isEntryLoading && !entryData)) {
    return (
      <div className="container mx-auto max-w-4xl p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-lg font-medium">Cargando entrada para editar...</p>
        <p className="text-sm text-gray-500 mt-2">ID: {entryId}</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!entryData && !isEntryLoading) {
    return (
      <div className="container mx-auto max-w-4xl p-8">
        <h1 className="text-2xl font-bold">Entrada no encontrada</h1>
        <p className="text-muted-foreground mt-2">
          La entrada que intentas editar no existe o no tienes permisos.
        </p>
        <div className="flex gap-2 mt-4">
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/new">Crear nueva entrada</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        
        <h1 className="text-2xl font-bold">Editar Reflexión</h1>
        <p className="text-muted-foreground">
          Modifica tu reflexión bíblica. Los cambios se guardarán automáticamente.
        </p>
      </div>

      {/* Información de depuración (solo desarrollo) */}
      {process.env.NODE_ENV === 'development' && entryData && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs">
          <p className="font-medium text-blue-800">DEBUG - Campos cargados:</p>
          <ul className="mt-1 text-blue-700 space-y-1">
            <li>📖 Versículo: {entryData.bibleBook ? `✅ ${entryData.bibleBook} ${entryData.chapter}:${entryData.bibleVerse}` : '✗'}</li>
            <li>👁️ Observación: {entryData.observation ? `✅ ${entryData.observation.length} caracteres` : '✗'}</li>
            <li>🎓 Enseñanza: {entryData.teaching ? `✅ ${entryData.teaching.length} caracteres` : '✗'}</li>
            <li>🚀 Aplicación: {entryData.practicalApplication ? `✅ ${entryData.practicalApplication.length} caracteres` : '✗'}</li>
          </ul>
        </div>
      )}

      {entryData && (
        <JournalForm 
          entry={entryData}
          onSave={() => {
            toast({
              title: "✅ Guardado exitoso",
              description: "Los cambios se guardaron correctamente",
              duration: 3000,
            });
            // Redirigir después de guardar
            setTimeout(() => router.push(`/entry/${entryId}`), 1500);
          }}
        />
      )}
    </div>
  );
}