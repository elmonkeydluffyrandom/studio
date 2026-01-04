'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { JournalEntry } from '@/lib/types';
import jsPDF from 'jspdf';
import html2canvas from 'jspdf-html2canvas';
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

    // Create a hidden element to render HTML for PDF conversion
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.width = '700px'; // A decent width for rendering
    document.body.appendChild(container);

    if (entry) {
        await addSingleEntryToPdf(doc, entry, container);
    } else if (entries && entries.length > 0) {
        // Bulk download needs a separate implementation with html2canvas
        addBulkEntriesToPdf(doc, entries); // This remains as text-based for now
    }
    
    document.body.removeChild(container);

    const fullBibleVerse = entry?.bibleVerse;
    const fileName = entry ? `${fullBibleVerse?.replace(/ /g, '_').replace(/:/g, '-')}.pdf` : 'BibliaDiario_Export.pdf';
    doc.save(fileName);
  };

  const addSingleEntryToPdf = async (doc: jsPDF, entry: JournalEntry, container: HTMLElement) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
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
    
    y = 55;

    // --- Content ---
    const addSection = async (label: string, htmlContent: string) => {
        if (!htmlContent) return;
        const usableWidth = pageWidth - margin * 2;
        const titleHeight = 10;
        const sectionSpacing = 12;

        if (y + titleHeight > doc.internal.pageSize.getHeight() - 25) {
            doc.addPage();
            y = 20;
        }
        
        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.setTextColor(headerColor);
        doc.text(label, margin, y);
        y += titleHeight;
        
        // Use html2canvas to render the HTML content
        container.innerHTML = `<div style="font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; width: ${usableWidth}mm;">${htmlContent}</div>`;

        await html2canvas(container, {
            useCORS: true,
            scale: 2,
            onclone: (clonedDoc) => {
                // This ensures styles are applied correctly in the canvas
                clonedDoc.body.style.fontFamily = "'Times New Roman', serif";
            },
        }).then((canvas) => {
             const imgData = canvas.toDataURL('image/png');
             const imgProps = doc.getImageProperties(imgData);
             const imgHeight = (imgProps.height * usableWidth) / imgProps.width;

            if (y + imgHeight > doc.internal.pageSize.getHeight() - 25) {
                doc.addPage();
                y = 20;
            }
             
            doc.addImage(imgData, 'PNG', margin, y, usableWidth, imgHeight, undefined, 'FAST');
            y += imgHeight;
        });

        y += sectionSpacing;
    };
    
    // Add scripture as plain text
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(headerColor);
    doc.text("Escritura (S - Scripture)", margin, y);
    y += 10;
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.setTextColor('#000000');
    const textLines = doc.splitTextToSize(entry.verseText, pageWidth - margin * 2);
    textLines.forEach((line: string) => {
        if (y > doc.internal.pageSize.getHeight() - 25) {
            doc.addPage();
            y = 20;
        }
        doc.text(line, margin, y);
        y += 7;
    });
    y += 12;

    await addSection("Observación (O - Observation)", entry.observation);
    await addSection("Enseñanza", entry.teaching);
    await addSection("Aplicación Práctica", entry.practicalApplication);

    if(entry.tagIds && entry.tagIds.length > 0){
      // This will be plain text for now
      y += 10;
      doc.setFont("times", "bold");
      doc.setFontSize(14);
      doc.setTextColor(headerColor);
      doc.text('Etiquetas', margin, y);
      y += 8;
      doc.setFont("times", "normal");
      doc.setFontSize(12);
      doc.setTextColor('#000000');
      doc.text(entry.tagIds.join(', '), margin, y);
    }
  }

  // NOTE: Bulk export does not support rich text formatting yet.
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
        const checkAndAddPage = () => {
             if (y + 20 > pageHeight - bottomMargin) { // Minimal check before adding new entry
                doc.addPage();
                y = 20;
            }
        }
        checkAndAddPage();
        y = addBulkEntryContent(doc, currentEntry, y);
    }
  }
  
  const addBulkEntryContent = (doc: jsPDF, entry: JournalEntry, startY: number) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const usableWidth = pageWidth - margin * 2;
    const bottomMargin = 25;
    let y = startY;

    const checkNewPage = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - bottomMargin) {
        doc.addPage();
        y = 20;
        return true;
      }
      return false;
    }

    // --- Header for each entry ---
    checkNewPage(16); // Header height
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

      if(checkNewPage(titleHeight)) {
        // If new page, redraw section title
        doc.setTextColor('#334155'); // slate-700
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.text(title, margin, y);
        y += titleHeight;
      } else {
        doc.setTextColor('#334155'); // slate-700
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.text(title, margin, y);
        y += titleHeight;
      }
      
      doc.setTextColor('#1e293b'); // slate-800
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      
      // For bulk export, we just strip HTML for now
      const plainText = content.replace(/<[^>]+>/g, '');
      const textLines = doc.splitTextToSize(plainText, usableWidth);

      textLines.forEach((line: string) => {
        checkNewPage(textLineHeight);
        doc.text(line, margin, y);
        y += textLineHeight;
      });

      y += 8; // spacing after section
    };
    
    addSection('Observación', entry.observation);
    addSection('Enseñanza', entry.teaching);
    addSection('Aplicación Práctica', entry.practicalApplication);
    
    // --- Separator ---
    if(!checkNewPage(10)) {
        doc.setDrawColor('#e2e8f0'); // slate-200
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10; // Extra space between entries
    }

    return y;
  }


  return (
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
}
