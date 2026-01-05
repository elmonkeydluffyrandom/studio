'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { JournalEntry } from '@/lib/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface DownloadPdfButtonProps {
  entry?: JournalEntry;
  entries?: JournalEntry[];
}

export default function DownloadPdfButton({ entry, entries }: DownloadPdfButtonProps) {
  
    const handleDownload = async () => {
        // Activamos compresión nativa del PDF
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            compress: true
        }); 
        
        if (entry) {
            await addEntryContent(pdf, entry, 0); 
            const fileName = `${(entry.bibleVerse || 'entrada').replace(/ /g, '_').replace(/:/g, '-')}.pdf`;
            pdf.save(fileName);
        } else if (entries && entries.length > 0) {
            await addBulkEntriesToPdf(pdf, entries);
            pdf.save('Mi_Diario_Biblico.pdf');
        }
    };

    const addBulkEntriesToPdf = async (doc: jsPDF, entries: JournalEntry[]) => {
        const getTime = (date: any): number => {
            if (!date) return 0;
            if (typeof date.toMillis === 'function') return date.toMillis();
            if (date.seconds) return date.seconds * 1000;
            return new Date(date).getTime();
        };
        const sortedEntries = [...entries].sort((a,b) => getTime(a.createdAt) - getTime(b.createdAt));

        // Portada General
        doc.setFillColor(15, 23, 42); // Azul oscuro (Slate 900)
        doc.rect(0, 0, 210, 297, 'F'); 
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('times', 'bold');
        doc.setFontSize(36);
        doc.text("Mi Diario Bíblico", 105, 140, { align: 'center' });
        
        for (const currentEntry of sortedEntries) {
            doc.addPage(); 
            await addEntryContent(doc, currentEntry, 0);
        }
    }
  
    const addEntryContent = async (doc: jsPDF, entry: JournalEntry, startY: number): Promise<number> => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const headerHeight = 45;
        const margin = 20;
        const usableWidth = pageWidth - (margin * 2);
        
        // --- 1. ENCABEZADO "DARK NAVY" ---
        doc.setFillColor(30, 41, 59); // Slate 800
        doc.rect(0, 0, pageWidth, headerHeight, 'F'); 

        // Título Principal
        doc.setTextColor(255, 255, 255);
        doc.setFont('times', 'bold');
        doc.setFontSize(24);
        const title = entry.bibleVerse || 'Sin Título';
        doc.text(title, pageWidth / 2, 22, { align: 'center' });

        // Fecha
        const getDate = (date: any) => {
            if (!date) return new Date();
            return typeof date.toDate === 'function' ? date.toDate() : new Date(date);
        }
        const dateStr = getDate(entry.createdAt).toLocaleDateString('es-ES', { 
            year: 'numeric', month: 'long', day: 'numeric' 
        });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(203, 213, 225); // Slate 300
        doc.text(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), pageWidth / 2, 32, { align: 'center' });

        let y = headerHeight + 12; 

        // --- HELPER MAESTRO: CORTE + COMPRESIÓN JPEG ---
        const addSection = async (sectionTitle: string, content: string, isPlain: boolean = false) => {
            if (!content) return;

            // 1. Título de la Sección
            if (y + 15 > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }

            doc.setTextColor(15, 23, 42); // Slate 900
            doc.setFont('times', 'bold');
            doc.setFontSize(13);
            doc.text(sectionTitle, margin, y);
            y += 4; 

            // 2. Preparar Contenido Continuo
            const tempContainer = document.createElement('div');
            tempContainer.style.width = `${usableWidth}mm`; 
            tempDivStyles(tempContainer);

            if (isPlain) {
                const paragraphs = content.split('\n').filter(p => p.trim());
                tempContainer.innerHTML = paragraphs.map(p => `<p>${p}</p>`).join('');
            } else {
                tempContainer.innerHTML = content;
            }

            // Inyectar en DOM
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.top = '0';
            document.body.appendChild(tempContainer);

            // 3. Generar Canvas Gigante (OPTIMIZADO: Escala 2.5 y Fondo Blanco)
            const canvas = await html2canvas(tempContainer, {
                scale: 2.5, // 2.5 es suficiente para leer bien y pesa la mitad que 4
                backgroundColor: '#ffffff', // Fondo blanco para que el JPEG no salga negro
                logging: false,
            });
            document.body.removeChild(tempContainer);

            // 4. Lógica de "Rebanado" (Slicing) con Compresión JPEG
            const imgDataFull = canvas; // Canvas fuente
            const srcWidth = imgDataFull.width;
            const srcHeight = imgDataFull.height;
            
            // Altura total en el PDF (mm)
            const pdfTotalHeight = (srcHeight * usableWidth) / srcWidth;
            
            let heightLeftInPdfMm = pdfTotalHeight; 
            let currentSrcY = 0; 
            const pxPerMm = srcWidth / usableWidth;

            while (heightLeftInPdfMm > 0) {
                const spaceOnPage = pageHeight - margin - y;
                
                // Cortamos lo que quepa
                const sliceHeightMm = Math.min(heightLeftInPdfMm, spaceOnPage);
                
                // Evitar tiritas minúsculas
                if (sliceHeightMm < 5 && heightLeftInPdfMm > 5) {
                    doc.addPage();
                    y = margin;
                    continue;
                }

                // Altura del corte en PX
                const sliceHeightPx = sliceHeightMm * pxPerMm;

                // Canvas temporal para el trozo
                const sliceCanvas = document.createElement('canvas');
                sliceCanvas.width = srcWidth;
                sliceCanvas.height = sliceHeightPx;
                
                const ctx = sliceCanvas.getContext('2d');
                if (ctx) {
                    // Rellenar de blanco por si acaso (JPEG no tiene transparencia)
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
                    
                    ctx.drawImage(
                        imgDataFull, 
                        0, currentSrcY, srcWidth, sliceHeightPx, // Origen
                        0, 0, srcWidth, sliceHeightPx            // Destino
                    );
                }

                // *** AQUÍ ESTÁ LA MAGIA DEL PESO ***
                // Convertimos el trozo a JPEG calidad 0.8
                const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.8);
                
                doc.addImage(sliceImgData, 'JPEG', margin, y, usableWidth, sliceHeightMm);
                
                y += sliceHeightMm;
                currentSrcY += sliceHeightPx;
                heightLeftInPdfMm -= sliceHeightMm;

                if (heightLeftInPdfMm > 0.1) { 
                    doc.addPage();
                    y = margin;
                }
            }

            y += 8;
        };

        await addSection('Escritura (S - Scripture)', entry.verseText, true);
        await addSection('Observación (O - Observation)', entry.observation);
        await addSection('Enseñanza', entry.teaching);
        await addSection('Aplicación Práctica', entry.practicalApplication);

        return y;
    }

    // --- ESTILOS ---
    const tempDivStyles = (div: HTMLElement) => {
        div.style.padding = '10px'; 
        div.style.boxSizing = 'border-box';
        div.style.fontFamily = '"Times New Roman", Times, serif';
        div.style.fontSize = '12pt';
        div.style.color = '#000000'; // Negro puro
        div.style.textAlign = 'justify';
        div.style.lineHeight = '1.5';
        div.style.marginBottom = '0px'; 
    };

    return (
        <Button
            onClick={handleDownload}
            variant="outline"
            disabled={!entry && (!entries || entries.length === 0)}
            className="w-full sm:w-auto"
        >
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
        </Button>
    );
}