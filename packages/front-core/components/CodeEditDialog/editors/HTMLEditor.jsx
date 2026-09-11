import React from 'react';

import RichTextEditor from 'components/RichTextEditor';

const HTMLEditor = ({ value, onChange }) => {
  let header, body, footer, parts;

  if (value) {
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
      onChange={(data) => onChange([[header, data].join('<body>'), footer].join('</body>'))}
    />
  );
};

export default HTMLEditor;
