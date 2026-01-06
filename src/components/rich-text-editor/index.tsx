'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import { MenuBar } from './menu-bar';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  name?: string; // from react-hook-form
}

export function RichTextEditor({ value = '', onChange, placeholder }: RichTextEditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        gapcursor: false,
        dropcursor: false,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (onChange) {
        onChange(html === '<p></p>' ? '' : html);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm max-w-none focus:outline-none min-h-[150px] p-3',
        'data-testid': 'rich-text-editor',
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!editor || !isMounted) return;
  
    const isSame = editor.getHTML() === value;
  
    if (isSame) {
      return;
    }
  
    // When the value prop changes, update the editor's content.
    // This is crucial for react-hook-form's reset() method to work.
    editor.commands.setContent(value, false);
    
  }, [value, editor, isMounted]);

  if (!isMounted || !editor) {
    return (
      <div className="border rounded-md overflow-hidden bg-background">
        <div className="flex items-center gap-1 p-2 border-b bg-muted/50 animate-pulse">
          <div className="h-8 w-8 bg-muted-foreground/20 rounded"></div>
          <div className="h-8 w-8 bg-muted-foreground/20 rounded"></div>
        </div>
        <div className="p-4 min-h-[150px] bg-background/30 animate-pulse">
          <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden bg-card relative">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      {placeholder && editor && !editor.getText().trim() && (
        <div className="absolute top-[52px] left-3 text-muted-foreground text-sm pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  );
}
