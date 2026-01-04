'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { JournalEntry } from '@/lib/types';
import jsPDF from 'jspdf';
import { Timestamp } from 'firebase/firestore';

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

    if (entry) {
        addSingleEntryToPdf(doc, entry);
    } else if (entries && entries.length > 0) {
        addBulkEntriesToPdf(doc, entries);
    }
    
    const fullBibleVerse = entry?.bibleVerse;
    const fileName = entry ? `${fullBibleVerse?.replace(/ /g, '_').replace(/:/g, '-')}.pdf` : 'BibliaDiario_Export.pdf';
    doc.save(fileName);
  };

  const addSingleEntryToPdf = (doc: jsPDF, entry: JournalEntry) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const bottomMargin = 25; // Safe bottom margin
    let y = 40;

    // --- Header ---
    const headerColor = '#1e293b'; // slate-800
    doc.setFillColor(headerColor);
    doc.rect(0, 0, pageWidth, 40, 'F'); // Filled rectangle for header

    // Title
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.setTextColor('#ffffff');
    const fullBibleVerse = entry.bibleVerse;
    doc.text(fullBibleVerse || 'Entrada Sin Título', pageWidth / 2, 20, { align: 'center' });

    // Date
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.setTextColor('#cbd5e1'); // slate-300
    const getDate = (date: Date | Timestamp) => {
      if (!date) return new Date();
      return date instanceof Timestamp ? date.toDate() : new Date(date);
    }
    const dateStr = getDate(entry.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(dateStr, pageWidth / 2, 28, { align: 'center' });

    // Reset text color for body
    doc.setTextColor('#000000');
    y = 55; // Start body content below the header


    // --- Content ---
    const addSection = (label: string, text: string) => {
        if (!text) return;
        const usableWidth = pageWidth - margin * 2;
        const titleHeight = 10;
        const textLineHeight = 7;
        const sectionSpacing = 12;

        // Check if title fits, if not, new page
        if (y + titleHeight > pageHeight - bottomMargin) {
            doc.addPage();
            y = 25;
        }
        
        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.setTextColor(headerColor); // Section title color
        doc.text(label, margin, y);
        y += titleHeight;

        // Process and draw text line by line
        const textLines = doc.splitTextToSize(text, usableWidth);
        doc.setFont("times", "normal");
        doc.setFontSize(12);
        doc.setTextColor('#000000'); // Body text color

        textLines.forEach((line: string) => {
            if (y + textLineHeight > pageHeight - bottomMargin) {
                doc.addPage();
                y = 25; 
            }
            doc.text(line, margin, y);
            y += textLineHeight;
        });

        y += sectionSpacing; // Add space after the section
    };
    
    addSection("Escritura (S - Scripture)", entry.verseText);
    addSection("Observación (O - Observation)", entry.observation);
    addSection("Enseñanza", entry.teaching);
    addSection("Aplicación Práctica", entry.practicalApplication);

    if(entry.tagIds && entry.tagIds.length > 0){
      addSection('Etiquetas', entry.tagIds.join(', '));
    }
  }

  const addBulkEntriesToPdf = (doc: jsPDF, entries: JournalEntry[]) => {
    let y = 20;
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomMargin = 25;
    
    const getTime = (date: any): number => {
      if (!date) return 0;
      if (typeof date.toMillis === 'function') return date.toMillis();
      if (date.seconds) return date.seconds * 1000;
      return new Date(date).getTime();
    };
    const sortedEntries = [...entries].sort((a,b) => getTime(a.createdAt) - getTime(b.createdAt));

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(28);
    doc.text("Mi Diario Bíblico", 20, y);
    y += 20;

    for (const currentEntry of sortedEntries) {
        const entryHeight = calculateEntryHeight(doc, currentEntry);
        if (y + entryHeight > pageHeight - bottomMargin) { // Check for new page before adding new entry
            doc.addPage();
            y = 20;
        }
        y = addBulkEntryContent(doc, currentEntry, y);
    }
  }
  
  const calculateEntryHeight = (doc: jsPDF, entry: JournalEntry): number => {
      const margin = 20;
      const usableWidth = doc.internal.pageSize.getWidth() - margin * 2;
      let height = 0;
      
      height += 16; // Header and date
      
      const addSectionHeight = (content: string) => {
          if (!content) return;
          height += 6; // Title
          const splitContent = doc.splitTextToSize(content, usableWidth);
          height += (splitContent.length * 5) + 8;
      };

      addSectionHeight(entry.observation);
      addSectionHeight(entry.teaching);
      height += 10; // Separator
      
      return height;
  }


  const addBulkEntryContent = (doc: jsPDF, entry: JournalEntry, startY: number) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const usableWidth = pageWidth - margin * 2;
    const bottomMargin = 25;
    let y = startY;

    // --- Header for each entry ---
    const headerColor = '#1e293b'; // slate-800
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(headerColor);
    const fullBibleVerse = entry.bibleVerse;
    doc.text(fullBibleVerse, margin, y);
    y += 8;

    const getDate = (date: Date | Timestamp) => {
      if (!date) return new Date();
      return date instanceof Timestamp ? date.toDate() : new Date(date);
    }
    const dateStr = getDate(entry.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.setTextColor('#64748b'); // slate-500
    doc.text(dateStr, margin, y);
    y += 8;


    // --- Body ---
    const addSection = (title: string, content: string) => {
      if (!content) return;
      
      const titleHeight = 6;
      const textLineHeight = 7;

      if (y + titleHeight > pageHeight - bottomMargin) {
          doc.addPage();
          y = 20;
      }
      
      doc.setTextColor('#334155'); // slate-700
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.text(title, margin, y);
      y += titleHeight;

      doc.setTextColor('#1e293b'); // slate-800
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      
      const textLines = doc.splitTextToSize(content, usableWidth);
      textLines.forEach((line: string) => {
        if(y + textLineHeight > pageHeight - bottomMargin) {
            doc.addPage();
            y = 20;
        }
        doc.text(line, margin, y);
        y += textLineHeight;
      });

      y += 8; // spacing after section
    };
    
    addSection('Observación', entry.observation);
    addSection('Enseñanza', entry.teaching);
    
    // --- Separator ---
    doc.setDrawColor('#e2e8f0'); // slate-200
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10; // Extra space between entries

    return y;
  }

  const buttonContent = (
    <Button
      onClick={handleDownload}
      variant="outline"
      disabled={!entry && (!entries || entries.length === 0)}
      aria-label="Descargar entrada como PDF"
    >
      <Download className="mr-2 h-4 w-4" />
      Descargar
    </Button>
  );

  return buttonContent;
}
