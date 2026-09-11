import Editor from 'components/Editor';

const CodeDocument = ({ file, fileType }) => {
  const value =
    fileType === 'json' ? JSON.stringify(file, null, 4) : atob(file.filePath.split(',').pop());

  return <Editor language={fileType} value={value} readOnly={true} />;
};

export default CodeDocument;
