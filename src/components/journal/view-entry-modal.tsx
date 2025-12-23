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
import { Edit, Trash2, Download } from 'lucide-react';
import { DeleteEntryDialog } from './delete-entry-dialog';
import { jsPDF } from "jspdf";
import { Timestamp } from 'firebase/firestore';


interface ViewEntryModalProps {
  entry: JournalEntry;
  onClose: () => void;
  onEdit: () => void;
  onDeleteCompleted: () => void;
}

export function ViewEntryModal({ entry, onClose, onEdit, onDeleteCompleted }: ViewEntryModalProps) {
  if (!entry) return null;

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // 1. Title
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.text(entry.bibleVerse || "Sin Título", 105, 20, { align: "center" });

    // 2. Date
    doc.setFontSize(12);
    doc.setFont("times", "italic");
    const getDate = (date: Date | Timestamp) => {
        if (!date) return new Date();
        return date instanceof Timestamp ? date.toDate() : new Date(date);
    }
    const dateStr = getDate(entry.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(dateStr, 105, 28, { align: "center" });

    // 3. Content
    let y = 40;
    const addSection = (label: string, text: string) => {
        if (!text) return;
        if (y > 250) {
            doc.addPage();
            y = 20;
        }
        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.text(label, 20, y);
        y += 8;
        doc.setFont("times", "normal");
        doc.setFontSize(12);
        const lines = doc.splitTextToSize(text, 170);
        doc.text(lines, 20, y);
        y += (lines.length * 5) + 10; // Adjusted spacing
    };

    addSection("Escritura", entry.verseText);
    addSection("Observación", entry.observation);
    addSection("Aplicación", entry.teaching);
    addSection("Oración", entry.practicalApplication);
    
    if(entry.tagIds && entry.tagIds.length > 0){
      addSection('Etiquetas', entry.tagIds.join(', '));
    }


    doc.save(`${entry.bibleVerse.replace(/ /g, '_').replace(/:/g, '-')}.pdf`);
  };

  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl sm:text-3xl font-headline font-bold text-foreground">
            {entry.bibleVerse}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {entry.createdAt ? `Creado el ${formatDate(entry.createdAt)}` : ''}
          </p>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6 pr-4 -mr-4">
            <div className="print-section">
                <h2 className="text-xl font-headline font-semibold print-section-title">Escritura (S - Scripture)</h2>
                <blockquote className="mt-2 border-l-4 border-primary pl-4 italic text-foreground/80 print-text">
                    {entry.verseText}
                </blockquote>
            </div>

            <div className="print-section">
                <h2 className="text-xl font-headline font-semibold print-section-title">Observación (O - Observation)</h2>
                <p className="mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed print-text">
                    {entry.observation}
                </p>
            </div>
            
            <div className="print-section">
                <h2 className="text-xl font-headline font-semibold print-section-title">Aplicación (A - Application)</h2>
                <p className="mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed print-text">
                    {entry.teaching}
                </p>
            </div>

            <div className="print-section">
                <h2 className="text-xl font-headline font-semibold print-section-title">Oración (P - Prayer)</h2>
                <p className="mt-2 text-foreground/90 whitespace-pre-wrap leading-relaxed print-text">
                    {entry.practicalApplication}
                </p>
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

        <DialogFooter className="mt-4 pt-4 border-t flex-shrink-0">
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" onClick={downloadPDF}>
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF
            </Button>
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
