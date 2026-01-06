// src/app/components/rich-text-editor/menu-bar.tsx - VERIFICA ESTO
'use client';

import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MenuBarProps {
  editor: Editor | null; // ← Cambié a Editor | null
}

export function MenuBar({ editor }: MenuBarProps) {
  // Si no hay editor, no renderizar nada
  if (!editor) {
    return (
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50 animate-pulse">
        <div className="h-8 w-8 bg-gray-200 rounded"></div>
        <div className="h-8 w-8 bg-gray-200 rounded"></div>
        <div className="h-8 w-8 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-muted/50" 
         style={{ zIndex: 50, position: 'relative' }}>
      
      {/* BOTÓN NEGRITA */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`min-w-[40px] h-9 px-2 ${editor.isActive('bold') ? 'bg-accent text-accent-foreground' : ''}`}
        title="Negrita (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>
      
      {/* BOTÓN CURSIVA */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`min-w-[40px] h-9 px-2 ${editor.isActive('italic') ? 'bg-accent text-accent-foreground' : ''}`}
        title="Cursiva (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-6 bg-border mx-1" />
      
      {/* LISTAS */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`min-w-[40px] h-9 px-2 ${editor.isActive('bulletList') ? 'bg-accent text-accent-foreground' : ''}`}
        title="Lista con viñetas"
      >
        <List className="h-4 w-4" />
      </Button>
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`min-w-[40px] h-9 px-2 ${editor.isActive('orderedList') ? 'bg-accent text-accent-foreground' : ''}`}
        title="Lista numerada"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-6 bg-border mx-1" />
      
      {/* DESHACER/REHACER */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="min-w-[40px] h-9 px-2"
        title="Deshacer (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </Button>
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="min-w-[40px] h-9 px-2"
        title="Rehacer (Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
}