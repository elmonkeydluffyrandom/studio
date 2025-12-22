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

    // Set fonts - jsPDF supports a few core fonts
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(entry.bibleVerse, 20, 30);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(12);
    const creationDate = `Creado el ${formatDate(entry.createdAt)}`;
    doc.text(creationDate, 20, 38);

    let y = 55;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableWidth = pageWidth - margin * 2;

    const addSection = (title: string, content: string, isQuote = false) => {
      if (y > 250) { // Check for new page
          doc.addPage();
          y = 20;
      }
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(title, margin, y);
      y += 8;

      doc.setFont('Helvetica', isQuote ? 'italic' : 'normal');
      doc.setFontSize(12);
      const splitContent = doc.splitTextToSize(content, usableWidth);
      doc.text(splitContent, margin, y);
      y += (splitContent.length * 5) + 10;
    };
    
    addSection('Escritura', entry.verseText, true);
    addSection('Observación', entry.observation);
    addSection('Enseñanza', entry.teaching);
    addSection('Aplicación Práctica', entry.practicalApplication);

    if(entry.tagIds && entry.tagIds.length > 0){
        addSection('Etiquetas', entry.tagIds.join(', '));
    }


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
