'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState, useRef } from 'react';
import { MenuBar } from './menu-bar';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const previousValue = useRef<string>('');
  const initAttempts = useRef(0);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
    ],
    content: '<p></p>', // Contenido inicial vacío
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (html !== previousValue.current) {
        previousValue.current = html;
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-3',
        'data-testid': 'rich-text-editor',
      },
    },
    immediatelyRender: false,
  });

  // Montar editor
  useEffect(() => {
    console.log('🔄 Editor: Inicializando componente');
    setIsMounted(true);
    
    return () => {
      console.log('🔄 Editor: Desmontando componente');
      setIsMounted(false);
      setIsInitialized(false);
    };
  }, []);

  // 🔥🔥🔥 FIX CRÍTICO: Sincronizar contenido externo
  useEffect(() => {
    if (!editor || !isMounted) {
      console.log('⏳ Editor: Esperando editor o montaje');
      return;
    }

    const normalizedValue = value || '<p></p>';
    const currentHtml = editor.getHTML();
    
    console.log('📊 Editor: Estado actual:', {
      valueFromProps: normalizedValue.substring(0, 100),
      currentEditorHtml: currentHtml.substring(0, 100),
      isInitialized,
      initAttempts: initAttempts.current
    });

    // Si es la primera vez y tenemos contenido
    if (!isInitialized && normalizedValue !== '<p></p>' && normalizedValue !== currentHtml) {
      console.log('🎯 Editor: Inicializando con contenido externo');
      
      // Esperar un poco para asegurar que el DOM esté listo
      const initTimeout = setTimeout(() => {
        try {
          editor.commands.setContent(normalizedValue);
          previousValue.current = normalizedValue;
          setIsInitialized(true);
          console.log('✅ Editor: Contenido inicial cargado exitosamente');
        } catch (error) {
          console.error('❌ Editor: Error al cargar contenido inicial:', error);
        }
      }, 100);
      
      initAttempts.current++;
      
      return () => clearTimeout(initTimeout);
    }

    // Si ya está inicializado y el valor cambió
    if (isInitialized && normalizedValue !== currentHtml && normalizedValue !== previousValue.current) {
      console.log('🔄 Editor: Actualizando contenido cambiado');
      
      const updateTimeout = setTimeout(() => {
        editor.commands.setContent(normalizedValue);
        previousValue.current = normalizedValue;
        console.log('✅ Editor: Contenido actualizado');
      }, 50);
      
      return () => clearTimeout(updateTimeout);
    }

  }, [editor, value, isMounted, isInitialized]);

  // Si no hay editor, mostrar skeleton
  if (!editor || !isMounted) {
    return (
      <div className="border rounded-md overflow-hidden">
        <div className="flex items-center gap-1 p-2 border-b bg-muted/50 animate-pulse">
          <div className="h-8 w-8 bg-muted-foreground/20 rounded"></div>
          <div className="h-8 w-8 bg-muted-foreground/20 rounded"></div>
          <div className="h-8 w-8 bg-muted-foreground/20 rounded"></div>
        </div>
        <div className="p-4 min-h-[150px] bg-muted/30 animate-pulse">
          <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden bg-background">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      {placeholder && !editor.getText().trim() && (
        <div className="absolute top-[70px] left-3 text-muted-foreground text-sm pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  );
}