'use client';

import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { JournalEntry } from '@/lib/types';
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

  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [entryData, setEntryData] = useState<JournalEntry | null>(null);
  const [isDebug, setIsDebug] = useState(false);
  const { toast } = useToast();

  const entryRef = useMemoFirebase(
    () => (user && firestore && entryId ? doc(firestore, 'users', user.uid, 'journalEntries', entryId) : null),
    [user, firestore, entryId]
  );

  const { data: rawEntry, isLoading: isEntryLoading } = useDoc<JournalEntry>(entryRef);

  // Normalización de datos
  useEffect(() => {
    if (rawEntry && entryId) {
      const getObservation = () => rawEntry.observation?.trim() || rawEntry.observacion?.trim() || '';
      const getTeaching = () => rawEntry.teaching?.trim() || rawEntry.ensenanza?.trim() || '';
      const getPracticalApplication = () =>
        rawEntry.practicalApplication?.trim() || rawEntry.aplicacion?.trim() || rawEntry.practica?.trim() || '';

      const normalizedEntry: JournalEntry = {
        id: entryId,
        userId: rawEntry.userId || user?.uid || '',
        bibleBook: rawEntry.bibleBook || '',
        chapter: Number(rawEntry.chapter) || 1,
        bibleVerse: rawEntry.bibleVerse || '',
        verseText: rawEntry.verseText || '',
        observation: getObservation(),
        teaching: getTeaching(),
        practicalApplication: getPracticalApplication(),
        observacion: getObservation(),
        ensenanza: getTeaching(),
        aplicacion: getPracticalApplication(),
        practica: getPracticalApplication(),
        tagIds: Array.isArray(rawEntry.tagIds) ? rawEntry.tagIds : [],
        fecha: rawEntry.fecha?.toDate?.() || new Date(rawEntry.fecha) || new Date(),
        createdAt: rawEntry.createdAt?.toDate?.() || new Date(rawEntry.createdAt) || new Date(),
        updatedAt: rawEntry.updatedAt?.toDate?.() || new Date(rawEntry.updatedAt) || new Date(),
        isSynced: rawEntry.isSynced !== undefined ? rawEntry.isSynced : true,
      };

      setEntryData(normalizedEntry);
      setIsDebug(true);

      if (normalizedEntry.observation || normalizedEntry.teaching || normalizedEntry.practicalApplication) {
        toast({
          title: 'Datos cargados',
          description: `Observación: ${normalizedEntry.observation.length} chars, Enseñanza: ${normalizedEntry.teaching.length} chars, Aplicación: ${normalizedEntry.practicalApplication.length} chars`,
          duration: 5000,
        });
      }
    }
  }, [rawEntry, entryId, user?.uid, toast]);

  // Respaldo desde localStorage
  useEffect(() => {
    if (!rawEntry && entryId && !isEntryLoading && user) {
      try {
        const offlineKey = `entry_${user.uid}_${entryId}`;
        const offlineData = localStorage.getItem(offlineKey);
        if (offlineData) {
          const localData = JSON.parse(offlineData);
          const normalizedLocal: JournalEntry = {
            id: entryId,
            userId: user.uid,
            bibleBook: localData.bibleBook || '',
            chapter: Number(localData.chapter) || 1,
            bibleVerse: localData.bibleVerse || '',
            verseText: localData.verseText || '',
            observation: localData.observation || localData.observacion || '',
            teaching: localData.teaching || localData.ensenanza || '',
            practicalApplication: localData.practicalApplication || localData.aplicacion || localData.practica || '',
            observacion: localData.observacion || localData.observation || '',
            ensenanza: localData.ensenanza || localData.teaching || '',
            aplicacion: localData.aplicacion || localData.practica || localData.practicalApplication || '',
            practica: localData.practica || localData.practicalApplication || '',
            tagIds: Array.isArray(localData.tagIds) ? localData.tagIds : [],
            fecha: new Date(localData.fecha) || new Date(),
            createdAt: new Date(localData.createdAt) || new Date(),
            updatedAt: new Date(localData.updatedAt) || new Date(),
            isSynced: false,
          };
          setEntryData(normalizedLocal);
          toast({
            title: 'Usando datos locales',
            description: 'Mostrando versión guardada en tu dispositivo',
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
        <Button variant="ghost" onClick={() => router.back()} className="gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">Editar Reflexión</h1>
        <p className="text-muted-foreground">
          Modifica tu reflexión bíblica. Los cambios se guardarán automáticamente.
        </p>
      </div>

      {entryData && (
        <JournalForm
          entry={entryData}
          defaultValues={{
            observacion: entryData.observation || '',
            ensenanza: entryData.teaching || '',
            aplicacion: entryData.practicalApplication || '',
          }}
          onSave={() => {
            toast({
              title: 'Guardado exitoso',
              description: 'Los cambios se guardaron correctamente',
              duration: 3000,
            });
            setTimeout(() => router.push(`/entry/${entryId}`), 1500);
          }}
        />
      )}
    </div>
  );
}
