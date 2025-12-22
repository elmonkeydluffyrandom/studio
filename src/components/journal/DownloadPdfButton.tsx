'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { JournalEntry } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface DownloadPdfButtonProps {
  entry: JournalEntry;
}

export default function DownloadPdfButton({ entry }: DownloadPdfButtonProps) {
  
  const handleDownload = async () => {
    console.log('Descargando PDF...');
    const { default: jsPDF } = await import('jspdf');

    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const usableWidth = pageWidth - margin * 2;
    let y = 0;

    // --- Header ---
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

    y = 55; // Initial Y position after header

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
      
      doc.setDrawColor(226, 232, 240); // Light gray line
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

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

    // --- Footer ---
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240); // Light gray line
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175); // Soft gray text
    doc.text('Generado con BibliaDiario', pageWidth / 2, pageHeight - 10, { align: 'center' });


    const fileName = `${entry.bibleVerse.replace(/ /g, '_').replace(/:/g, '-')}.pdf`;
    doc.save(fileName);
  };

  return (
    <Button
      onClick={handleDownload}
      variant="outline"
      size="icon"
      className="no-print fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg border-2 z-50 bg-background/80 backdrop-blur-sm"
      aria-label="Descargar entrada como PDF"
    >
      <Download className="h-6 w-6" />
    </Button>
  );
}
