import React from 'react';
import Editor from 'components/Editor';

interface CodeDocumentProps {
  file: unknown;
  fileType: string;
}

const CodeDocument = ({ file, fileType }: CodeDocumentProps) => {
  const value =
    fileType === 'json' ? JSON.stringify(file, null, 4) : atob((file as { filePath: string }).filePath.split(',').pop() as string);

  return <Editor language={fileType} value={value} readOnly={true} />;
};

export default CodeDocument;
