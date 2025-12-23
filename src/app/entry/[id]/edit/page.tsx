'use client';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Edit, Trash2, Save, X } from 'lucide-react';
import { DeleteEntryDialog } from '@/components/journal/delete-entry-dialog';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import type { JournalEntry } from '@/lib/types';
import Login from '@/components/auth/login';
import DownloadPdfButton from '@/components/journal/DownloadPdfButton';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { BIBLE_BOOKS } from '@/lib/bible-books';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl } from '@/components/ui/form';
import JournalForm from '@/components/journal/journal-form';

export default function EntryEditPage() {
  const { id } = useParams();
  const entryId = Array.isArray(id) ? id[0] : id;
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const entryRef = useMemoFirebase(
    () => (user && firestore && entryId ? doc(firestore, 'users', user.uid, 'journalEntries', entryId) : null),
    [user, firestore, entryId]
  );

  const { data: entry, isLoading: isEntryLoading } = useDoc<JournalEntry>(entryRef);

  if (isUserLoading || (entryRef && isEntryLoading)) {
    return <div className="container mx-auto max-w-4xl text-center p-8">Cargando...</div>;
  }

  if (!user) {
    return <Login />;
  }

  if (!entry) {
    return (
        <div className="container mx-auto max-w-4xl text-center p-8">
            <h1 className="text-2xl font-bold">Entrada no encontrada</h1>
            <p className="text-muted-foreground mt-2">
                La entrada que buscas no existe o ha sido eliminada.
            </p>
            <Button asChild className="mt-4">
                <Link href="/">Volver al Dashboard</Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl">
      <JournalForm entry={entry} />
    </div>
  );
}
