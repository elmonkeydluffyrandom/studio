'use client';

import React from 'react';
import { useQuill } from 'react-quilljs';
import 'quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string; // name is passed by react-hook-form Controller
}

export const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
  const { quill, quillRef } = useQuill({
    modules: {
      toolbar: [
        ['bold', 'italic'],
      ],
    },
    formats: ['bold', 'italic'],
    placeholder,
  });

  React.useEffect(() => {
    if (quill) {
      quill.on('text-change', () => {
        onChange(quill.root.innerHTML);
      });
    }
  }, [quill, onChange]);

  React.useEffect(() => {
    if (quill && quill.root.innerHTML !== value) {
      // Use dangerouslyPasteHTML to set the initial content.
      // This is generally safer than directly manipulating innerHTML
      // and is the recommended way for initial content in Quill.
      const delta = quill.clipboard.convert(value);
      quill.setContents(delta, 'silent');
    }
  }, [quill, value]);

  return (
    <div className="rich-text-editor bg-background">
      <div ref={quillRef} />
    </div>
  );
};

RichTextEditor.displayName = 'RichTextEditor';