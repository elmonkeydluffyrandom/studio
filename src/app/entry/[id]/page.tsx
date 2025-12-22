import { getEntry } from '@/lib/actions';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Edit, Printer, Trash2 } from 'lucide-react';
import { DeleteEntryDialog } from '@/components/journal/delete-entry-dialog';

export default async function EntryDetailPage({ params }: { params: { id: string } }) {
  const entry = await getEntry(params.id);

  if (!entry) {
    notFound();
  }

  const PrintButton = () => {
    'use client';
    return (
        <Button
          onClick={() => window.print()}
          variant="outline"
          size="icon"
          className="no-print fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg border-2 z-50 bg-background/80 backdrop-blur-sm"
          aria-label="Imprimir entrada"
        >
          <Printer className="h-6 w-6" />
        </Button>
    );
  };

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
            <h1 className="text-4xl font-headline font-bold text-foreground print-title">{entry.bibleReference}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Creado el {formatDate(entry.createdAt)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/entry/${entry.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Link>
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
            {entry.application}
          </p>
        </div>

        {entry.tags.length > 0 && (
          <div className="print-section print-tags">
            <h3 className="text-lg font-headline font-semibold print-section-title">Etiquetas</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {entry.tags.map(tag => (
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
