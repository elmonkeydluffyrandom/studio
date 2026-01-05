'use client';

import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react'; // Agregamos estado para loading
import type { JournalEntry } from '@/lib/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast'; // Importar toast para errores

interface DownloadPdfButtonProps {
  entry?: JournalEntry;
  entries?: JournalEntry[];
}

export default function DownloadPdfButton({ entry, entries }: DownloadPdfButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();
  
    const handleDownload = async () => {
        try {
            setIsGenerating(true);
            
            // Pausa pequeña para que la UI se actualice y muestre el spinner
            await new Promise(resolve => setTimeout(resolve, 100));

            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
                compress: true
            }); 
            
            let fileName = 'Mi_Diario_Biblico.pdf';

            if (entry) {
                await addEntryContent(pdf, entry, 0); 
                fileName = `${(entry.bibleVerse || 'entrada').replace(/ /g, '_').replace(/:/g, '-')}.pdf`;
            } else if (entries && entries.length > 0) {
                await addBulkEntriesToPdf(pdf, entries);
            }

            // --- TRUCO PARA MÓVILES (Blob Download) ---
            // Guardar directamente suele fallar en Android/iOS PWAs.
            // Es mejor generar un BLOB y forzar el clic en un enlace.
            const pdfBlob = pdf.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            
            // Limpieza
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast({ title: "Éxito", description: "PDF descargado correctamente." });

        } catch (error) {
            console.error("Error generando PDF:", error);
            toast({ 
                variant: "destructive", 
                title: "Error", 
                description: "No se pudo generar el PDF. Intenta con una entrada más corta o reinicia la app." 
            });
        } finally {
            setIsGenerating(false);
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
        const pageWidth = doc.internal.pageSize.getWidth(); 
        const pageHeight = doc.internal.pageSize.getHeight(); 
        const headerHeight = 45;
        const margin = 20;
        const usableWidth = pageWidth - (margin * 2);
        
        // Encabezado
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

        // Helper Sección
        const addSection = async (sectionTitle: string, content: string, isPlain: boolean = false) => {
            if (!content) return;

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

            // OPTIMIZACIÓN MÓVIL: Escala reducida a 2 para evitar crash de memoria
            const canvas = await html2canvas(tempContainer, {
                scale: 2, // Antes 2.5. '2' es mucho más seguro en celulares.
                backgroundColor: '#ffffff',
                logging: false,
            });
            document.body.removeChild(tempContainer);

            const imgDataFull = canvas;
            const srcWidth = imgDataFull.width;
            const srcHeight = imgDataFull.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            const pdfTotalHeight = (srcHeight * usableWidth) / srcWidth;
            
            let heightLeftInPdfMm = pdfTotalHeight; 
            let currentSrcY = 0; 
            const pxPerMm = srcWidth / usableWidth;

            while (heightLeftInPdfMm > 0) {
                const spaceOnPageMm = pageHeight - margin - y;
                
                let sliceHeightMm = Math.min(heightLeftInPdfMm, spaceOnPageMm);
                let sliceHeightPx = sliceHeightMm * pxPerMm;

                // CORTE INTELIGENTE
                if (heightLeftInPdfMm > spaceOnPageMm && ctx) {
                    const searchZoneHeightPx = 50 * 2; // Ajustado a escala 2
                    const checkStartY = currentSrcY + sliceHeightPx;
                    
                    for (let offset = 0; offset < searchZoneHeightPx; offset++) {
                        const testY = Math.floor(checkStartY - offset);
                        if (testY <= currentSrcY) break;

                        const pixelRow = ctx.getImageData(0, testY, srcWidth, 1).data;
                        let isWhiteRow = true;
                        
                        for (let p = 0; p < pixelRow.length; p += 40) { 
                            if (pixelRow[p] < 250 || pixelRow[p+1] < 250 || pixelRow[p+2] < 250) {
                                isWhiteRow = false;
                                break;
                            }
                        }

                        if (isWhiteRow) {
                            sliceHeightPx = testY - currentSrcY;
                            sliceHeightMm = sliceHeightPx / pxPerMm;
                            break;
                        }
                    }
                }

                if (sliceHeightMm < 2 && heightLeftInPdfMm > 5) {
                    doc.addPage();
                    y = margin;
                    continue;
                }

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

                const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.80); // JPEG un poco más comprimido
                
                doc.addImage(sliceImgData, 'JPEG', margin, y, usableWidth, sliceHeightMm);
                
                y += sliceHeightMm;
                currentSrcY += sliceHeightPx;
                heightLeftInPdfMm = Math.max(0, heightLeftInPdfMm - sliceHeightMm);

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
            disabled={(!entry && (!entries || entries.length === 0)) || isGenerating}
            className="w-full sm:w-auto"
        >
            {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Download className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? 'Generando...' : 'Descargar PDF'}
        </Button>
    );
}