'use client';

import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MenuBarProps {
  editor: Editor | null;
}

export function MenuBar({ editor }: MenuBarProps) {
  if (!editor) {
    return (
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50 animate-pulse">
        <div className="h-8 w-8 bg-gray-200 rounded"></div>
        <div className="h-8 w-8 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-accent' : ''}
        title="Negrita (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-accent' : ''}
        title="Cursiva (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>
    </div>
  );
}
