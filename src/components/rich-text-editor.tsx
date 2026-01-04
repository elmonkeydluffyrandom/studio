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
      // Listen for text changes and bubble them up
      quill.on('text-change', (delta, oldDelta, source) => {
        if (source === 'user') {
          onChange(quill.root.innerHTML);
        }
      });
    }
  }, [quill, onChange]);

  React.useEffect(() => {
    // When the external 'value' prop changes, update Quill's content
    // This is crucial for populating the editor when editing an existing entry
    if (quill && value !== quill.root.innerHTML) {
      // Use clipboard.convert to properly handle HTML string
      const delta = quill.clipboard.convert(value);
      // Set content silently to avoid triggering the text-change event unnecessarily
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
