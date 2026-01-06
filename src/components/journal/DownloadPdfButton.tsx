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
  
    // Función específica para iOS (Safari es problemático con descargas)
    const downloadForIOS = (pdf: jsPDF, fileName: string) => {
        try {
            const pdfDataUri = pdf.output('datauristring');
            
            // Crear una nueva ventana con el PDF y instrucciones
            const newWindow = window.open();
            if (newWindow) {
                newWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${fileName}</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            * {
                                margin: 0;
                                padding: 0;
                                box-sizing: border-box;
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            }
                            body {
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                min-height: 100vh;
                                padding: 20px;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                            }
                            .container {
                                background: white;
                                border-radius: 20px;
                                padding: 30px;
                                width: 100%;
                                max-width: 500px;
                                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                                text-align: center;
                            }
                            .icon {
                                font-size: 60px;
                                margin-bottom: 20px;
                            }
                            h1 {
                                color: #333;
                                margin-bottom: 15px;
                                font-size: 24px;
                                font-weight: 700;
                            }
                            .instructions {
                                background: #f8f9fa;
                                border-radius: 15px;
                                padding: 20px;
                                margin: 20px 0;
                                text-align: left;
                                border-left: 4px solid #4CAF50;
                            }
                            .instructions ol {
                                margin-left: 20px;
                                margin-top: 10px;
                            }
                            .instructions li {
                                margin-bottom: 10px;
                                color: #555;
                                line-height: 1.5;
                            }
                            .highlight {
                                background: #fff3cd;
                                padding: 3px 6px;
                                border-radius: 4px;
                                font-weight: 600;
                            }
                            .pdf-viewer {
                                width: 100%;
                                height: 400px;
                                border-radius: 10px;
                                margin-top: 20px;
                                border: 2px solid #e0e0e0;
                            }
                            .button-container {
                                display: flex;
                                gap: 10px;
                                margin-top: 25px;
                                flex-wrap: wrap;
                                justify-content: center;
                            }
                            .btn {
                                padding: 12px 24px;
                                border-radius: 50px;
                                border: none;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                text-decoration: none;
                                display: inline-block;
                            }
                            .btn-primary {
                                background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
                                color: white;
                            }
                            .btn-secondary {
                                background: #6c757d;
                                color: white;
                            }
                            .btn:hover {
                                transform: translateY(-2px);
                                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                            }
                            .note {
                                margin-top: 20px;
                                color: #666;
                                font-size: 14px;
                                font-style: italic;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="icon">📱</div>
                            <h1>Tu PDF está listo</h1>
                            
                            <div class="instructions">
                                <strong>Para guardar en iPhone/iPad:</strong>
                                <ol>
                                    <li>Toca el ícono de <span class="highlight">compartir (📤)</span> en la barra inferior</li>
                                    <li>Desliza hacia abajo y selecciona <span class="highlight">"Guardar en Archivos"</span></li>
                                    <li>Elige una carpeta (recomendado: "En mi iPhone" → "Descargas")</li>
                                    <li>Toca <span class="highlight">"Guardar"</span> en la esquina superior derecha</li>
                                </ol>
                            </div>
                            
                            <iframe 
                                class="pdf-viewer" 
                                src="${pdfDataUri}"
                                title="Vista previa del PDF"
                            ></iframe>
                            
                            <div class="button-container">
                                <a href="${pdfDataUri}" download="${fileName}" class="btn btn-primary">
                                    ⬇️ Intentar Descarga Directa
                                </a>
                                <button onclick="window.print()" class="btn btn-secondary">
                                    🖨️ Imprimir
                                </button>
                            </div>
                            
                            <p class="note">
                                Si la descarga directa no funciona, usa las instrucciones de arriba.
                            </p>
                        </div>
                    </body>
                    </html>
                `);
                newWindow.document.close();
                
                toast({
                    title: "📱 PDF listo para iOS",
                    description: "Se abrió en una nueva ventana. Sigue las instrucciones para guardar.",
                    duration: 8000,
                });
            } else {
                // Si bloquea popup, mostrar data URI directamente
                window.location.href = pdfDataUri;
            }
        } catch (error) {
            console.error("Error en iOS download:", error);
            toast({
                variant: "destructive",
                title: "Error en iOS",
                description: "Intenta usar una computadora o otro navegador",
            });
        }
    };

    // Función principal de descarga
    const handleDownload = async () => {
        try {
            setIsGenerating(true);
            
            // Mostrar toast de "Generando" inmediatamente
            toast({ 
                title: "⏳ Generando PDF", 
                description: "Estamos preparando tu documento...",
                duration: 3000,
            });

            // Pequeña pausa para permitir que se muestre el toast
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

            // Detectar dispositivo
            const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
            const isAndroid = /Android/i.test(navigator.userAgent);
            const isMobile = isIOS || isAndroid;

            // ============ ESTRATEGIAS DIFERENTES POR DISPOSITIVO ============
            
            if (isIOS) {
                // iOS necesita tratamiento especial
                downloadForIOS(pdf, fileName);
                setIsGenerating(false);
                return; // Salir temprano para iOS
            }
            
            // Para Android y Desktop
            const pdfBlob = pdf.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            
            // Método 1: Enlace tradicional (funciona en Android y Desktop)
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            
            // Método 2: Iframe como respaldo (para Android)
            if (isAndroid) {
                setTimeout(() => {
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.src = url;
                    document.body.appendChild(iframe);
                    
                    setTimeout(() => {
                        document.body.removeChild(iframe);
                    }, 1000);
                }, 300);
            }
            
            // Limpiar recursos
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 2000);
            
            // Mensajes según dispositivo
            if (isAndroid) {
                toast({ 
                    title: "✅ PDF enviado a descargas", 
                    description: "Revisa la carpeta 'Descargas' o 'Downloads' en tu dispositivo.",
                    duration: 5000,
                });
            } else {
                toast({ 
                    title: "✅ PDF descargado", 
                    description: "El archivo se ha descargado correctamente.",
                    duration: 4000,
                });
            }

        } catch (error) {
            console.error("Error generando PDF:", error);
            
            // Si hay error, ofrecer método alternativo manual
            toast({ 
                variant: "destructive", 
                title: "❌ Error en descarga automática", 
                description: "Intentemos con un método manual...",
                duration: 4000,
            });
            
            // Crear un botón de descarga manual como fallback
            setTimeout(() => {
                try {
                    const manualSection = document.createElement('div');
                    manualSection.id = 'manual-download-section';
                    manualSection.style.cssText = `
                        position: fixed;
                        bottom: 20px;
                        left: 20px;
                        right: 20px;
                        background: white;
                        padding: 20px;
                        border-radius: 15px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                        z-index: 10000;
                        border: 2px solid #4CAF50;
                    `;
                    
                    manualSection.innerHTML = `
                        <h3 style="margin-bottom: 10px; color: #333;">📥 Descarga Manual</h3>
                        <p style="margin-bottom: 15px; color: #666;">Toca el botón de abajo y mantén presionado, luego selecciona "Descargar enlace"</p>
                        <a href="#" id="manual-download-link" 
                           style="display: block; padding: 15px; background: #4CAF50; color: white; 
                                  text-align: center; border-radius: 10px; text-decoration: none;
                                  font-weight: bold; font-size: 16px;">
                            ⬇️ DESCARGAR PDF MANUALMENTE
                        </a>
                        <button onclick="document.getElementById('manual-download-section').remove()" 
                                style="margin-top: 10px; padding: 10px; width: 100%; 
                                       background: #f44336; color: white; border: none; 
                                       border-radius: 10px; cursor: pointer;">
                            Cerrar
                        </button>
                    `;
                    
                    document.body.appendChild(manualSection);
                    
                    // Configurar el enlace manual
                    setTimeout(() => {
                        const manualLink = document.getElementById('manual-download-link');
                        if (manualLink) {
                            manualLink.addEventListener('click', (e) => {
                                e.preventDefault();
                                // Aquí necesitaríamos regenerar el PDF o guardarlo en localStorage
                                toast({
                                    title: "Recargando PDF...",
                                    description: "Por favor toca el botón de descarga principal nuevamente",
                                    duration: 3000,
                                });
                            });
                        }
                    }, 100);
                    
                } catch (manualError) {
                    console.error("Error creando descarga manual:", manualError);
                }
            }, 1000);
            
        } finally {
            // Siempre quitar el estado de generación
            setTimeout(() => {
                setIsGenerating(false);
            }, 2000);
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
            data-pdf-button="true"
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