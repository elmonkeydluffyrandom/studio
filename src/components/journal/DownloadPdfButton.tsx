'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { JournalEntry } from '@/lib/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Timestamp } from 'firebase/firestore';

interface DownloadPdfButtonProps {
  entry?: JournalEntry;
  entries?: JournalEntry[];
}

export default function DownloadPdfButton({ entry, entries }: DownloadPdfButtonProps) {
  
    const handleDownload = async () => {
        if (entry) {
            // Temporarily add a class to the body to activate print styles
            document.body.classList.add('print-mode');

            const element = document.querySelector('.print-container');
            if (element) {
                // We clone the node to avoid manipulating the original element
                const clonedElement = element.cloneNode(true) as HTMLElement;
                
                // We need to append it to the body to make sure styles are applied
                clonedElement.style.position = 'absolute';
                clonedElement.style.left = '-9999px';
                clonedElement.style.width = '210mm'; // A4 width
                clonedElement.style.padding = '20mm'; // Standard margins
                document.body.appendChild(clonedElement);


                html2canvas(clonedElement, {
                    scale: 2, // Higher scale for better quality
                    useCORS: true,
                    windowWidth: clonedElement.scrollWidth,
                    windowHeight: clonedElement.scrollHeight
                }).then(canvas => {
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const canvasWidth = canvas.width;
                    const canvasHeight = canvas.height;
                    const ratio = canvasHeight / canvasWidth;
                    const imgHeight = pdfWidth * ratio;
                    let heightLeft = imgHeight;
                    let position = 0;

                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                    heightLeft -= pdfHeight;

                    while (heightLeft > 0) {
                        position = heightLeft - imgHeight;
                        pdf.addPage();
                        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                        heightLeft -= pdfHeight;
                    }
                    
                    const fullBibleVerse = entry?.bibleVerse;
                    const fileName = entry ? `${fullBibleVerse?.replace(/ /g, '_').replace(/:/g, '-')}.pdf` : 'BibliaDiario_Export.pdf';
                    pdf.save(fileName);
                    
                    // Cleanup
                    document.body.removeChild(clonedElement);
                    document.body.classList.remove('print-mode');
                });
            }
        } else if (entries && entries.length > 0) {
            // Bulk download logic (remains text-based for now)
            const doc = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
            });
            addBulkEntriesToPdf(doc, entries);
            doc.save('BibliaDiario_Export.pdf');
        }
    };


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
