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

        // Portada
        doc.setFillColor(15, 23, 42); 
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
        const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
        const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
        const headerHeight = 45;
        const margin = 20;
        const usableWidth = pageWidth - (margin * 2);
        
        // --- 1. ENCABEZADO ---
        doc.setFillColor(30, 41, 59); 
        doc.rect(0, 0, pageWidth, headerHeight, 'F'); 

        doc.setTextColor(255, 255, 255);
        doc.setFont('times', 'bold');
        doc.setFontSize(24);
        const title = entry.bibleVerse || 'Sin Título';
        doc.text(title, pageWidth / 2, 22, { align: 'center' });

        const getDate = (date: any) => {
            if (!date) return new Date();
            return typeof date.toDate === 'function' ? date.toDate() : new Date(date);
        }
        const dateStr = getDate(entry.createdAt).toLocaleDateString('es-ES', { 
            year: 'numeric', month: 'long', day: 'numeric' 
        });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(203, 213, 225); 
        doc.text(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), pageWidth / 2, 32, { align: 'center' });

        let y = headerHeight + 12; 

        // --- HELPER CON CORTE INTELIGENTE ---
        const addSection = async (sectionTitle: string, content: string, isPlain: boolean = false) => {
            if (!content) return;

            // Título
            if (y + 15 > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }

            doc.setTextColor(15, 23, 42); 
            doc.setFont('times', 'bold');
            doc.setFontSize(13);
            doc.text(sectionTitle, margin, y);
            y += 4; 

            // Renderizar Contenido
            const tempContainer = document.createElement('div');
            tempContainer.style.width = `${usableWidth}mm`; 
            tempDivStyles(tempContainer);

            if (isPlain) {
                const paragraphs = content.split('\n').filter(p => p.trim());
                tempContainer.innerHTML = paragraphs.map(p => `<p>${p}</p>`).join('');
            } else {
                tempContainer.innerHTML = content;
            }

            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.top = '0';
            document.body.appendChild(tempContainer);

            // Generar Canvas
            const canvas = await html2canvas(tempContainer, {
                scale: 2.5, 
                backgroundColor: '#ffffff',
                logging: false,
            });
            document.body.removeChild(tempContainer);

            const imgDataFull = canvas;
            const srcWidth = imgDataFull.width;
            const srcHeight = imgDataFull.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true }); // Optimización para leer pixeles
            
            // Altura total en PDF (mm)
            const pdfTotalHeight = (srcHeight * usableWidth) / srcWidth;
            
            let heightLeftInPdfMm = pdfTotalHeight; 
            let currentSrcY = 0; 
            const pxPerMm = srcWidth / usableWidth;

            while (heightLeftInPdfMm > 0) {
                const spaceOnPageMm = pageHeight - margin - y;
                
                // 1. Calculamos dónde DEBERÍAMOS cortar
                let sliceHeightMm = Math.min(heightLeftInPdfMm, spaceOnPageMm);
                let sliceHeightPx = sliceHeightMm * pxPerMm;

                // 2. CORTE INTELIGENTE: Si vamos a cortar a la mitad (y no es el final), buscamos un espacio en blanco
                if (heightLeftInPdfMm > spaceOnPageMm && ctx) {
                    const searchZoneHeightPx = 50 * 2.5; // Buscar hasta 50px hacia arriba (aprox 1-2 líneas)
                    const checkStartY = currentSrcY + sliceHeightPx;
                    
                    // Escanear hacia arriba buscando una fila blanca
                    for (let offset = 0; offset < searchZoneHeightPx; offset++) {
                        const testY = Math.floor(checkStartY - offset);
                        if (testY <= currentSrcY) break; // No subir más allá del inicio

                        // Obtener una línea de pixeles
                        const pixelRow = ctx.getImageData(0, testY, srcWidth, 1).data;
                        let isWhiteRow = true;
                        
                        // Chequear cada pixel de la fila (saltando de 10 en 10 para velocidad)
                        for (let p = 0; p < pixelRow.length; p += 40) { 
                            const r = pixelRow[p];
                            const g = pixelRow[p+1];
                            const b = pixelRow[p+2];
                            // Si no es blanco puro (permitiendo un poco de antialiasing), detectamos texto
                            if (r < 250 || g < 250 || b < 250) {
                                isWhiteRow = false;
                                break;
                            }
                        }

                        if (isWhiteRow) {
                            // ¡Encontramos un hueco! Cortamos aquí
                            sliceHeightPx = testY - currentSrcY;
                            sliceHeightMm = sliceHeightPx / pxPerMm;
                            break;
                        }
                    }
                }

                // Evitar cortes microscópicos si algo falla
                if (sliceHeightMm < 2 && heightLeftInPdfMm > 5) {
                    doc.addPage();
                    y = margin;
                    continue;
                }

                // 3. Crear el trozo
                const sliceCanvas = document.createElement('canvas');
                sliceCanvas.width = srcWidth;
                sliceCanvas.height = sliceHeightPx;
                
                const sliceCtx = sliceCanvas.getContext('2d');
                if (sliceCtx) {
                    sliceCtx.fillStyle = '#ffffff';
                    sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
                    
                    sliceCtx.drawImage(
                        imgDataFull, 
                        0, currentSrcY, srcWidth, sliceHeightPx, 
                        0, 0, srcWidth, sliceHeightPx            
                    );
                }

                const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.85); // JPEG Calidad 85%
                
                doc.addImage(sliceImgData, 'JPEG', margin, y, usableWidth, sliceHeightMm);
                
                y += sliceHeightMm;
                currentSrcY += sliceHeightPx;
                heightLeftInPdfMm = Math.max(0, heightLeftInPdfMm - sliceHeightMm); // Evitar negativos

                // Si aún queda contenido, añadimos página
                if (heightLeftInPdfMm > 0.5) { 
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

    const tempDivStyles = (div: HTMLElement) => {
        div.style.padding = '10px'; 
        div.style.boxSizing = 'border-box';
        div.style.fontFamily = '"Times New Roman", Times, serif';
        div.style.fontSize = '12pt';
        div.style.color = '#000000'; 
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