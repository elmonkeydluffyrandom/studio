'use client';
import { notFound, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { DeleteEntryDialog } from '@/components/journal/delete-entry-dialog';
import PrintButton from '@/components/journal/print-button';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { JournalEntry } from '@/lib/types';
import Login from '@/components/auth/login';

export default function EntryDetailPage() {
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
    return <div className="container mx-auto max-w-4xl text-center p-8">Cargando...</div>;
  }

  if (!user) {
    return <Login />;
  }

  // After loading, if the entry is not found, show a specific message.
  if (!entry && !isEntryLoading) {
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

  // This check is necessary for TypeScript to be sure 'entry' is not null.
  if (!entry) {
    return null; 
  }

  return (
    <div className="container mx-auto max-w-4xl print-container">
      <header className="mb-8 no-print">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
          <div>
            <h1 className="text-4xl font-headline font-bold text-foreground print-title">{entry.bibleVerse}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {entry.createdAt ? `Creado el ${formatDate(entry.createdAt)}` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/entry/${entry.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>
            <DeleteEntryDialog entryId={entry.id ?? ''}>
              <Button variant="destructive" >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            </DeleteEntryDialog>
          </div>
        </div>
      </header>

      {/* Content for both screen and print */}
      <div className="space-y-8">
        <div className="print-section">
          <h2 className="text-2xl font-headline font-semibold print-section-title">Escritura (Scripture)</h2>
          <blockquote className="mt-2 border-l-4 border-primary pl-4 italic text-foreground/80 print-text">
            {entry.verseText}
          </blockquote>
        </div>

        <div className="print-section">
          <h2 className="text-2xl font-headline font-semibold print-section-title">Observación (Observation)</h2>
          <p className="mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed print-text">
            {entry.observation}
          </p>
        </div>
        
        <div className="print-section">
          <h2 className="text-2xl font-headline font-semibold print-section-title">Enseñanza (Application)</h2>
          <p className="mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed print-text">
            {entry.teaching}
          </p>
        </div>

        <div className="print-section">
          <h2 className="text-2xl font-headline font-semibold print-section-title">Aplicación Práctica (Prayer)</h2>
          <p className="mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed print-text">
            {entry.practicalApplication}
          </p>
        </div>

        {entry.tagIds && entry.tagIds.length > 0 && (
          <div className="print-section print-tags">
            <h3 className="text-lg font-headline font-semibold print-section-title">Etiquetas</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {entry.tagIds.map(tag => (
                <Badge key={tag} variant="secondary" className="print-tag">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
      <PrintButton />
    </div>
  );
}
