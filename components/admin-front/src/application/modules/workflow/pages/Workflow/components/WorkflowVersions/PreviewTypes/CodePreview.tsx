import React from 'react';

import Editor, { DiffEditor } from 'components/Editor';

interface CodePreviewProps {
  data?: string;
  compare?: string;
  type: string;
}

const CodePreview = ({ data, compare, type }: CodePreviewProps) => {
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
