import React from 'react';

import Editor, { DiffEditor } from 'components/Editor';

const CodePreview = ({ data, compare, type }) => {
  if (!compare) {
    return (
      <Editor
        language={type}
        value={data || ''}
        width="100%"
        height="100%"
        options={{
          readOnly: true,
        }}
      />
    );
  }

  return (
    <DiffEditor
      language={type}
      original={compare}
      modified={data}
      width="100%"
      height="100%"
      options={{
        readOnly: true,
      }}
    />
  );
};

export default CodePreview;
