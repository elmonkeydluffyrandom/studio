'use client';

import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react'; 
import type { JournalEntry } from '@/lib/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast'; 

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
            
            // Mostrar toast de "Generando" inmediatamente
            toast({ 
                title: "Generando PDF", 
                description: "Por favor espera...",
                duration: 3000,
            });

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

            // Para mejor compatibilidad con móviles
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                // iOS - usar método alternativo
                const pdfData = pdf.output('datauristring');
                const newWindow = window.open();
                if (newWindow) {
                    newWindow.document.write(`
                        <iframe 
                            width="100%" 
                            height="100%" 
                            src="${pdfData}"
                            style="border: none;"
                        ></iframe>
                    `);
                    newWindow.document.title = fileName;
                    
                    toast({ 
                        title: "PDF listo", 
                        description: "El PDF se abrió en una nueva ventana. Usa 'Compartir' para guardarlo.",
                        duration: 5000,
                    });
                }
            } else if (/Android/i.test(navigator.userAgent)) {
                // Android - método mejorado
                const pdfBlob = pdf.output('blob');
                const url = URL.createObjectURL(pdfBlob);
                
                // Intentar con iframe primero
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = url;
                document.body.appendChild(iframe);
                
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    URL.revokeObjectURL(url);
                }, 1000);
                
                toast({ 
                    title: "PDF descargado", 
                    description: "Revisa tu carpeta de descargas o notificaciones.",
                    duration: 4000,
                });
            } else {
                // Desktop y otros navegadores
                const pdfBlob = pdf.output('blob');
                const url = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 100);
                
                toast({ 
                    title: "✅ PDF descargado", 
                    description: "El archivo se ha descargado correctamente.",
                    duration: 4000,
                });
            }

        } catch (error) {
            console.error("Error generando PDF:", error);
            toast({ 
                variant: "destructive", 
                title: "Error", 
                description: "Hubo un problema al generar el PDF. Intenta de nuevo." 
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
            doc.setFontSize(15);
            let displayTitle = sectionTitle;
            if (sectionTitle.includes('(')) {
                displayTitle = sectionTitle.split('(')[0].trim();
            }
            doc.text(displayTitle, margin, y);
            
            y += 2; 

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

            const canvas = await html2canvas(tempContainer, {
                scale: 2, 
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
                    const searchZoneHeightPx = 50 * 2; 
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

                const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.80); 
                
                doc.addImage(sliceImgData, 'JPEG', margin, y, usableWidth, sliceHeightMm);
                
                y += sliceHeightMm;
                currentSrcY += sliceHeightPx;
                heightLeftInPdfMm = Math.max(0, heightLeftInPdfMm - sliceHeightMm);

                if (heightLeftInPdfMm > 0.5) { 
                    doc.addPage();
                    y = margin;
                }
            }

            y += 15;
        };

        await addSection('Escritura (S - Scripture)', entry.verseText, true);
        await addSection('Observación (O - Observation)', entry.observation);
        await addSection('Enseñanza', entry.teaching);
        await addSection('Aplicación Práctica', entry.practicalApplication);

        return y;
    }

    const tempDivStyles = (div: HTMLElement) => {
        div.style.padding = '2px 10px 5px 10px'; 
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