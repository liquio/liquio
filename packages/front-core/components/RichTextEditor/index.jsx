import React from 'react';

import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

import './styles.css';

export const RichTextEditor = ({ value, onChange, ...props }) => (
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