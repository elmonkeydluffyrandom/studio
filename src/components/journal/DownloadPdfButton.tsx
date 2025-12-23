'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { JournalEntry } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import jsPDF from 'jspdf';

interface DownloadPdfButtonProps {
  entry?: JournalEntry;
  entries?: JournalEntry[];
}

export default function DownloadPdfButton({ entry, entries }: DownloadPdfButtonProps) {
  
  const handleDownload = async () => {
    if (!entry && (!entries || entries.length === 0)) {
        console.log("No entries to download.");
        return;
    }

    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

    // Use a serif font
    doc.setFont('Times', 'normal');

    if (entry) {
        // Download single entry
        addEntryToPdf(doc, entry);
    } else if (entries && entries.length > 0) {
        // Download multiple entries
        let y = 20;
        const sortedEntries = [...entries].sort((a,b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(28);
        doc.text("Mi Diario Bíblico", 20, y);
        y += 20;

        for (const currentEntry of sortedEntries) {
            y = addBulkEntryToPdf(doc, currentEntry, y);
            if (y > 250) { // Check for new page
                doc.addPage();
                y = 20;
            }
        }
    }
    
    const fileName = entry ? `${entry.bibleVerse.replace(/ /g, '_').replace(/:/g, '-')}.pdf` : 'BibliaDiario_Export.pdf';
    doc.save(fileName);
  };

  const addEntryToPdf = (doc: jsPDF, entry: JournalEntry) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const usableWidth = pageWidth - margin * 2;
    let y = 30;

    // --- Header ---
    doc.setFont('Times', 'bold');
    doc.setFontSize(22);
    doc.text(entry.bibleVerse, pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    doc.setFont('Times', 'italic');
    doc.setFontSize(12);
    const creationDate = `Creado el ${formatDate(entry.createdAt)}`;
    doc.text(creationDate, pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setDrawColor(180, 180, 180); // gray line
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;


    // --- Body ---
    const addSection = (title: string, content: string, isQuote = false) => {
      if (y > 260) { // Check for new page
          doc.addPage();
          y = 25;
      }
      
      doc.setFont('Times', 'bold');
      doc.setFontSize(14);
      doc.text(title, margin, y);
      y += 8;

      doc.setFont('Times', isQuote ? 'italic' : 'normal');
      doc.setFontSize(12);
      
      const splitContent = doc.splitTextToSize(content || 'N/A', usableWidth);
      doc.text(splitContent, margin, y);

      y += (splitContent.length * 5) + 12; // Adjust y based on content length
    };
    
    addSection('Escritura (S)', entry.verseText, true);
    addSection('Observación (O)', entry.observation);
    addSection('Aplicación (A)', entry.teaching);
    addSection('Oración (P)', entry.practicalApplication);

    if(entry.tagIds && entry.tagIds.length > 0){
        addSection('Etiquetas', entry.tagIds.join(', '));
    }
  }

  const addBulkEntryToPdf = (doc: jsPDF, entry: JournalEntry, startY: number) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const usableWidth = pageWidth - margin * 2;
    let y = startY;

    // --- Header ---
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(entry.bibleVerse, margin, y);
    y += 8;
    doc.setDrawColor(226, 232, 240); // Light gray line
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;


    // --- Body ---
    const addSection = (title: string, content: string) => {
      if (y > 250) { // Check for new page
          doc.addPage();
          y = 20;
      }
      
      doc.setTextColor(41, 51, 66);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(title, margin, y);
      y += 6;

      doc.setTextColor(71, 85, 105);
      doc.setFont('Helvetica', 'normal');
      
      const splitContent = doc.splitTextToSize(content, usableWidth);
      doc.text(splitContent, margin, y);

      y += (splitContent.length * 4) + 8;
    };
    
    addSection('Observación', entry.observation);
    addSection('Aplicación', entry.teaching);
    
    y += 5; // Extra space between entries

    return y;
  }

  const buttonContent = entry 
    ? (
      <Button
        onClick={handleDownload}
        variant="outline"
        size="icon"
        className="no-print fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg border-2 z-50 bg-background/80 backdrop-blur-sm"
        aria-label="Descargar entrada como PDF"
      >
        <Download className="h-6 w-6" />
      </Button>
    ) : (
      <Button
        onClick={handleDownload}
        variant="outline"
        disabled={!entries || entries.length === 0}
      >
        <Download className="mr-2 h-4 w-4" />
        Exportar PDF
      </Button>
    );

  return buttonContent;
}
