'use client';
import JournalForm from '@/components/journal/journal-form';
import { notFound, useParams } from 'next/navigation';
import { useDoc, useMemoFirebase, useUser, useFirestore } from '@/firebase';
import type { JournalEntry } from '@/lib/types';
import { doc } from 'firebase/firestore';
import Login from '@/components/auth/login';

export default function EditEntryPage() {
  const { id } = useParams();
  const entryId = Array.isArray(id) ? id[0] : id;
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const entryRef = useMemoFirebase(
    () => (user && firestore && entryId ? doc(firestore, 'users', user.uid, 'journalEntries', entryId) : null),
    [user, firestore, entryId]
  );
  const { data: entry, isLoading: isEntryLoading } = useDoc<JournalEntry>(entryRef);

  if (isUserLoading || isEntryLoading) {
    return <div className="container mx-auto max-w-4xl text-center p-8">Cargando...</div>
  }
  
  if (!user) {
    return <Login />;
  }

  if (!entry && !isEntryLoading) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-4xl">
      <JournalForm entry={entry as JournalEntry} />
    </div>
  );
}
