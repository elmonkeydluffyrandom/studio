'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { DeleteEntryDialog } from '@/components/journal/delete-entry-dialog';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { JournalEntry } from '@/lib/types';
import Login from '@/components/auth/login';
import DownloadPdfButton from '@/components/journal/DownloadPdfButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import JournalForm from '@/components/journal/journal-form';

export default function EntryDetailPage() {
  const { id } = useParams();
  const entryId = Array.isArray(id) ? id[0] : id;
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isEditing, setIsEditing] = useState(false);

  const entryRef = useMemoFirebase(
    () => (user && firestore && entryId ? doc(firestore, 'users', user.uid, 'journalEntries', entryId) : null),
    [user, firestore, entryId]
  );

  const { data: entry, isLoading: isEntryLoading } = useDoc<JournalEntry>(entryRef);

  if (isUserLoading || (entryRef && isEntryLoading)) {
    return <div className="container mx-auto max-w-4xl text-center p-4 md:p-6 lg:p-8">Cargando...</div>;
  }

  if (!user) {
    return <Login />;
  }

  if (!entry) {
    return (
        <div className="container mx-auto max-w-4xl text-center p-4 md:p-6 lg:p-8">
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

  const handleCloseModal = () => {
    setIsEditing(false);
  };

  const fullBibleVerse = `${entry.bibleBook} ${entry.chapter}:${entry.bibleVerse}`;


  return (
    <>
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
              <h1 className="text-2xl sm:text-4xl font-headline font-bold text-foreground print-title">{fullBibleVerse}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {entry.createdAt ? `Creado el ${formatDate(entry.createdAt)}` : ''}
              </p>
            </div>
            <div className="flex gap-2 self-start sm:self-center">
              <DownloadPdfButton entry={entry} />
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
              </Button>
              <DeleteEntryDialog entryId={entry.id}>
                <Button variant="destructive" >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                </Button>
              </DeleteEntryDialog>
            </div>
          </div>
        </header>

        <div className="space-y-8">
          <div className="print-section">
            <h2 className="text-2xl font-headline font-semibold print-section-title">Escritura (S - Scripture)</h2>
            <blockquote className="mt-2 border-l-4 border-primary pl-4 italic text-foreground/80 print-text">
                {entry.verseText}
            </blockquote>
          </div>

          <div className="print-section">
            <h2 className="text-2xl font-headline font-semibold print-section-title">Observación (O - Observation)</h2>
            <div
              className="prose prose-sm md:prose-base dark:prose-invert max-w-none mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed print-text"
              dangerouslySetInnerHTML={{ __html: entry.observation }}
            />
          </div>
          
          <div className="print-section">
            <h2 className="text-2xl font-headline font-semibold print-section-title">Enseñanza</h2>
            <div
              className="prose prose-sm md:prose-base dark:prose-invert max-w-none mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed print-text"
              dangerouslySetInnerHTML={{ __html: entry.teaching }}
            />
          </div>

          <div className="print-section">
            <h2 className="text-2xl font-headline font-semibold print-section-title">Aplicación Práctica</h2>
            <div
              className="prose prose-sm md:prose-base dark:prose-invert max-w-none mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed print-text"
              dangerouslySetInnerHTML={{ __html: entry.practicalApplication }}
            />
          </div>

          { (entry.tagIds && entry.tagIds.length > 0) && (
            <div className="print-section print-tags">
              <h3 className="text-lg font-headline font-semibold print-section-title">Etiquetas</h3>
              <div className="mt-2 flex flex-wrap gap-2">
              {entry.tagIds?.map(tag => (
                  <Badge key={tag} variant="secondary" className="print-tag">
                  {tag}
                  </Badge>
              ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Editar Entrada</DialogTitle>
          </DialogHeader>
          {entry && <JournalForm entry={entry} onSave={handleCloseModal} isModal={true} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
