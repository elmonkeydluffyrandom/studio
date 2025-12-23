'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { JournalEntry } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface DownloadPdfButtonProps {
  entry?: JournalEntry;
  entries?: JournalEntry[];
}

export default function DownloadPdfButton({ entry, entries }: DownloadPdfButtonProps) {
  
  const handleDownload = async () => {
    console.log('Descargando PDF...');
    const { default: jsPDF } = await import('jspdf');

    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

    if (entry) {
        // Download single entry
        addEntryToPdf(doc, entry, 20);
    } else if (entries && entries.length > 0) {
        // Download multiple entries
        let y = 20;
        const sortedEntries = [...entries].sort((a,b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));

        doc.setFontSize(28);
        doc.text("Mi Diario Bíblico", 20, y);
        y += 20;

        for (const currentEntry of sortedEntries) {
            y = addEntryToPdf(doc, currentEntry, y, true);
            if (y > 250) { // Check for new page
                doc.addPage();
                y = 20;
            }
        }
    } else {
        console.log("No entries to download.");
        return;
    }
    
    const fileName = entry ? `${entry.bibleVerse.replace(/ /g, '_').replace(/:/g, '-')}.pdf` : 'BibliaDiario_Export.pdf';
    doc.save(fileName);
  };

  const addEntryToPdf = (doc: jsPDF, entry: JournalEntry, startY: number, isSummary = false) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const usableWidth = pageWidth - margin * 2;
    let y = startY;

    // --- Header ---
    if (!isSummary) {
        doc.setFillColor(30, 41, 59); // Dark blue-gray (#1e293b)
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(22);
        doc.text(entry.bibleVerse, margin, 22);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        const creationDate = `Creado el ${formatDate(entry.createdAt)}`;
        doc.text(creationDate, margin, 30);
        y = 55;
    } else {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text(entry.bibleVerse, margin, y);
        y += 8;
        doc.setDrawColor(226, 232, 240); // Light gray line
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
    }


    // --- Body ---
    const addSection = (title: string, content: string, isQuote = false) => {
      if (y > 250) { // Check for new page
          doc.addPage();
          y = 20;
      }
      
      doc.setTextColor(41, 51, 66); // Dark text color
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(title, margin, y);
      y += 6;
      
      if (!isSummary) {
        doc.setDrawColor(226, 232, 240); // Light gray line
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
      }

      doc.setTextColor(71, 85, 105); // Standard text color
      doc.setFont('Helvetica', isQuote ? 'italic' : 'normal');
      doc.setFontSize(12);
      
      const splitContent = doc.splitTextToSize(content, usableWidth);
      doc.text(splitContent, margin, y, {
        lineHeightFactor: 1.5,
      });

      y += (splitContent.length * 5 * 1.5) + 12; // Adjust y based on content length
    };
    
    addSection('Escritura', entry.verseText, true);
    addSection('Observación', entry.observation);
    addSection('Enseñanza', entry.teaching);
    addSection('Aplicación Práctica', entry.practicalApplication);

    if(entry.tagIds && entry.tagIds.length > 0){
        addSection('Etiquetas', entry.tagIds.join(', '));
    }
    
    if (isSummary) {
      y += 10; // Extra space between entries in summary
    }

    // --- Footer ---
    if (!isSummary) {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setDrawColor(226, 232, 240); // Light gray line
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175); // Soft gray text
        doc.text('Generado con BibliaDiario', pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
    
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
