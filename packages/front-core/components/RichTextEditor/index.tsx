import React from 'react';

import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

import './styles.css';

interface RichTextEditorProps {
  value?: string;
  onChange: (data: string) => void;
  [key: string]: unknown;
}

export const RichTextEditor = ({ value, onChange, ...props }: RichTextEditorProps) => (
  <CKEditor
    {...props}
    height="100%"
    editor={ClassicEditor}
    data={value}
    onChange={(event, editor) => {
      const data = editor.getData();
      onChange(data);
    }}
  />
);

export default RichTextEditor;
