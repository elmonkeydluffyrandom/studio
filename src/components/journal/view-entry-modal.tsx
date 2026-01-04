'use client';

import type { JournalEntry } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Edit, Trash2 } from 'lucide-react';
import { DeleteEntryDialog } from './delete-entry-dialog';
import DownloadPdfButton from './DownloadPdfButton';

interface ViewEntryModalProps {
  entry: JournalEntry;
  onClose: () => void;
  onEdit: () => void;
  onDeleteCompleted: () => void;
}

export function ViewEntryModal({ entry, onClose, onEdit, onDeleteCompleted }: ViewEntryModalProps) {
  if (!entry) return null;
  const fullBibleVerse = entry.bibleVerse;

  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-6 pr-4 -mr-4 print-container-modal">
            <DialogHeader className="print-section">
              <DialogTitle className="text-2xl sm:text-3xl font-headline font-bold text-foreground print-title">
                {fullBibleVerse}
              </DialogTitle>
              <p className="text-sm text-muted-foreground !mt-1">
                {entry.createdAt ? `Creado el ${formatDate(entry.createdAt)}` : ''}
              </p>
            </DialogHeader>
            <div className="print-section">
                <h2 className="text-xl font-headline font-semibold print-section-title">Escritura (S - Scripture)</h2>
                <blockquote className="mt-2 border-l-4 border-primary pl-4 italic text-foreground/80 print-text">
                    {entry.verseText}
                </blockquote>
            </div>

            <div className="print-section">
                <h2 className="text-xl font-headline font-semibold print-section-title">Observación (O - Observation)</h2>
                 <div
                    className="prose prose-sm md:prose-base dark:prose-invert max-w-none mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed print-text"
                    dangerouslySetInnerHTML={{ __html: entry.observation }}
                 />
            </div>
            
            <div className="print-section">
                <h2 className="text-xl font-headline font-semibold print-section-title">Enseñanza</h2>
                 <div
                    className="prose prose-sm md:prose-base dark:prose-invert max-w-none mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed print-text"
                    dangerouslySetInnerHTML={{ __html: entry.teaching }}
                />
            </div>

            <div className="print-section">
                <h2 className="text-xl font-headline font-semibold print-section-title">Aplicación Práctica</h2>
                <div
                    className="prose prose-sm md:prose-base dark:prose-invert max-w-none mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed print-text"
                    dangerouslySetInnerHTML={{ __html: entry.practicalApplication }}
                />
            </div>

            {(entry.tagIds && entry.tagIds.length > 0) && (
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

        <DialogFooter className="mt-4 pt-4 border-t flex-shrink-0 no-print">
          <div className="flex w-full justify-end gap-2">
            <DownloadPdfButton entry={entry} />
            <Button variant="outline" onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
            </Button>
            <DeleteEntryDialog entryId={entry.id} onDeleted={onDeleteCompleted}>
              <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
              </Button>
            </DeleteEntryDialog>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
