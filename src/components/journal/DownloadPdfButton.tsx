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
        const pdf = new jsPDF('p', 'mm', 'a4');
        if (entry) {
            await addSingleEntryToPdf(pdf, entry);
            const fullBibleVerse = entry?.bibleVerse;
            const fileName = entry ? `${fullBibleVerse?.replace(/ /g, '_').replace(/:/g, '-')}.pdf` : 'BibliaDiario_Export.pdf';
            pdf.save(fileName);

        } else if (entries && entries.length > 0) {
            await addBulkEntriesToPdf(pdf, entries);
            pdf.save('BibliaDiario_Export.pdf');
        }
    };

  const addSingleEntryToPdf = async (pdf: jsPDF, entry: JournalEntry) => {
    // This function will now use html2canvas on the modal or detail page content
    const element = document.querySelector('.print-container-modal') ?? document.querySelector('.print-container');
    
    if (element) {
        await html2canvas(element as HTMLElement, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight,
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasHeight / canvasWidth;
            let imgHeight = pdfWidth * ratio;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
        });
    }
  }


  const addBulkEntriesToPdf = async (doc: jsPDF, entries: JournalEntry[]) => {
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
        y = await addBulkEntryContent(doc, currentEntry, y);
    }
  }
  
  const addBulkEntryContent = async (doc: jsPDF, entry: JournalEntry, startY: number): Promise<number> => {
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
    const addSection = async (title: string, content: string) => {
      if (!content) return;
      
      const titleHeight = 6;
      checkNewPage(titleHeight);
      doc.setTextColor('#334155'); // slate-700
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.text(title, margin, y);
      y += titleHeight;
      
      const tempDiv = document.createElement('div');
      tempDiv.style.width = `${usableWidth}mm`;
      tempDiv.style.fontFamily = 'times';
      tempDiv.style.fontSize = '12pt';
      tempDiv.style.color = '#1e293b';
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.textAlign = 'justify';
      tempDiv.style.lineHeight = '1.5';
      tempDiv.innerHTML = content; // Use innerHTML to parse b and i tags
      document.body.appendChild(tempDiv);
      
      await html2canvas(tempDiv, {
          scale: 2,
          windowWidth: tempDiv.scrollWidth,
          windowHeight: tempDiv.scrollHeight,
          backgroundColor: null, // Transparent background
      }).then(canvas => {
          const imgData = canvas.toDataURL('image/png');
          const imgProps = doc.getImageProperties(imgData);
          const imgHeight = (imgProps.height * usableWidth) / imgProps.width;

          checkNewPage(imgHeight);
          doc.addImage(imgData, 'PNG', margin, y, usableWidth, imgHeight);
          y += imgHeight;
      });

      document.body.removeChild(tempDiv);
      y += 4; // spacing after section
    };
    
    await addSection('Observación', entry.observation);
    await addSection('Enseñanza', entry.teaching);
    await addSection('Aplicación Práctica', entry.practicalApplication);
    
    // --- Separator ---
    if(y < pageHeight - bottomMargin - 10) {
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
