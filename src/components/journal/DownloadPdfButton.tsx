'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import type { JournalEntry } from '@/lib/types';

interface DownloadPdfButtonProps {
  entry: JournalEntry;
}

export default function DownloadPdfButton({ entry }: DownloadPdfButtonProps) {
  const handleDownload = async () => {
    console.log('Descargando PDF...');
    
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF();

    // Set properties
    doc.setFont('helvetica', 'normal');

    // Title
    doc.setFontSize(22);
    doc.text(entry.bibleVerse, 20, 20);

    // Helper function for word wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + (lines.length * lineHeight);
    };

    let currentY = 30;
    const sectionMargin = 10;
    const textMargin = 5;
    const maxWidth = 170; // Page width - margins (210 - 20 - 20)
    const lineHeight = 7;

    // Scripture
    doc.setFontSize(16);
    doc.text('Escritura (Scripture)', 20, currentY);
    currentY += textMargin;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    currentY = addWrappedText(`"${entry.verseText}"`, 20, currentY, maxWidth, lineHeight);
    doc.setFont('helvetica', 'normal');
    currentY += sectionMargin;

    // Observation
    doc.setFontSize(16);
    doc.text('Observación (Observation)', 20, currentY);
    currentY += textMargin;
    doc.setFontSize(12);
    currentY = addWrappedText(entry.observation, 20, currentY, maxWidth, lineHeight);
    currentY += sectionMargin;

    // Teaching
    doc.setFontSize(16);
    doc.text('Enseñanza (Application)', 20, currentY);
    currentY += textMargin;
    doc.setFontSize(12);
    currentY = addWrappedText(entry.teaching, 20, currentY, maxWidth, lineHeight);
    currentY += sectionMargin;
    
    // Practical Application
    doc.setFontSize(16);
    doc.text('Aplicación Práctica (Prayer)', 20, currentY);
    currentY += textMargin;
    doc.setFontSize(12);
    currentY = addWrappedText(entry.practicalApplication, 20, currentY, maxWidth, lineHeight);
    
    // Sanitize verse for filename
    const filename = `${entry.bibleVerse.replace(/[:\s]/g, '_')}.pdf`;
    doc.save(filename);
  };

  return (
    <Button
      onClick={handleDownload}
      variant="outline"
      size="icon"
      className="no-print fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg border-2 z-50 bg-background/80 backdrop-blur-sm"
      aria-label="Descargar entrada como PDF"
    >
      <Printer className="h-6 w-6" />
    </Button>
  );
}
