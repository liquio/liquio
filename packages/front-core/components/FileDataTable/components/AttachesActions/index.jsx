import React from 'react';

import DownloadFile from './DownloadFile';
import DownloadP7SFile from './DownloadP7SFile';
import ShowPreview from './ShowPreview';
import FileModal from './FileModal';
import DeleteFile from './DeleteFile';

export default ({ item, actions, fileStorage, darkTheme, GridActionsCellItem }) => {
  const { handleDownloadFile, handleDeleteFile } = actions || {};
  return (
    <>
      {handleDownloadFile ? (
        <DownloadFile item={item} handleDownloadFile={handleDownloadFile} />
      ) : null}
      {item.signature && handleDownloadFile ? (
        <DownloadP7SFile item={item} handleDownloadFile={handleDownloadFile} />
      ) : null}
      <ShowPreview
        item={item}
        fileStorage={fileStorage}
        handleDownloadFile={handleDownloadFile}
        darkTheme={darkTheme}
        GridActionsCellItem={GridActionsCellItem}
      />
      <FileModal item={item} fileStorage={fileStorage} />
      {handleDeleteFile ? (
        <DeleteFile item={item} handleDeleteFile={handleDeleteFile} />
      ) : null}
    </>
  );
};
