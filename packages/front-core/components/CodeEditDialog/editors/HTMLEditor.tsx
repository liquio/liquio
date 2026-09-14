import React from 'react';

import RichTextEditor from 'components/RichTextEditor';

interface HTMLEditorProps {
  value?: string;
  onChange: (value: string) => void;
}

const HTMLEditor = ({ value, onChange }: HTMLEditorProps) => {
  let header = '';
  let body = '';
  let footer = '';

  if (value) {
    let parts = '';
    [header = '', parts = ''] = value.split('<body>');
    [body = '', footer = ''] = parts.split('</body>');
  }

  if (header && !body) {
    body = header;
    header = '';
  }

  return (
    <RichTextEditor
      value={body}
      onChange={(data: string) => onChange([[header, data].join('<body>'), footer].join('</body>'))}
    />
  );
};

export default HTMLEditor;
