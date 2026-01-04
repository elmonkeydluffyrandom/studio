'use client';

import React, { forwardRef } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string;
}

export const RichTextEditor = forwardRef<typeof ReactQuill, RichTextEditorProps>(
  ({ value, onChange, placeholder, name }, ref) => {
    const modules = {
      toolbar: [
        ['bold', 'italic'],
      ],
    };

    const formats = [
      'bold', 'italic',
    ];

    return (
      <div className="rich-text-editor bg-background">
        <ReactQuill
          // @ts-ignore
          ref={ref}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          // The name is passed to the underlying textarea for form handling
          // but Quill doesn't directly use a "name" prop on the component itself.
          // This is mostly for semantics and accessibility if needed.
          // The `name` prop isn't standard for ReactQuill but doesn't hurt.
          // We handle field registration via react-hook-form's Controller.
          // name={name}
        />
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';
