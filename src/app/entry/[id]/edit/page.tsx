'use client';

import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { JournalEntry } from '@/lib/types';
import Login from '@/components/auth/login';
import JournalForm from '@/components/journal/journal-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function EditEntryPage() {
  const { id } = useParams();
  const entryId = Array.isArray(id) ? id[0] : id;

  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const entryRef = useMemoFirebase(
    () => (user && firestore && entryId ? doc(firestore, 'users', user.uid, 'journalEntries', entryId) : null),
    [user, firestore, entryId]
  );

  const { data: entry, isLoading: isEntryLoading } = useDoc<JournalEntry>(entryRef);

  if (isUserLoading || (entryRef && isEntryLoading)) {
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

  if (!entry && !isEntryLoading) {
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
      <JournalForm entry={entry} />
    </div>
  );
}
