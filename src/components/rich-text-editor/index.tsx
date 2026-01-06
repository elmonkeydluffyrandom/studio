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
  const previousValue = useRef<string>('');
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
    ],
    content: '<p></p>',
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
      },
    },
  });

  // Montar editor
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Sincronizar valor externo - FIX CRÍTICO
  useEffect(() => {
    if (!editor || !isMounted) return;
    
    const normalizedValue = value || '<p></p>';
    const currentHtml = editor.getHTML();
    
    // Solo actualizar si el valor externo es diferente
    if (normalizedValue !== currentHtml && normalizedValue !== previousValue.current) {
      console.log('📝 Editor: Actualizando contenido', {
        from: currentHtml.substring(0, 50),
        to: normalizedValue.substring(0, 50)
      });
      
      // Usar setTimeout para evitar conflictos de renderizado
      setTimeout(() => {
        editor.commands.setContent(normalizedValue);
        previousValue.current = normalizedValue;
      }, 10);
    }
  }, [editor, value, isMounted]);

  if (!editor || !isMounted) {
    return (
      <div className="border rounded-md p-4 min-h-[150px] bg-muted animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      {placeholder && !editor.getText() && (
        <div className="absolute top-[70px] left-3 text-muted-foreground pointer-events-none text-sm">
          {placeholder}
        </div>
      )}
    </div>
  );
}