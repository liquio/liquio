import React from 'react';
import { Box } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

import { getPreview } from '../actions/fileLibrary';

const Thumbnail = ({ item, dispatch }) => {
  const [src, setSrc] = React.useState(null);

  React.useEffect(() => {
    let current = true;
    let url;

    if (item.type !== 'file') {
      return undefined;
    }

    getPreview({ dispatch, id: item.id })
      .then((blob) => {
        if (!current || !(blob instanceof Blob)) {
          return;
        }
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => setSrc(null));

    return () => {
      current = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [dispatch, item.id, item.type]);

  if (item.type === 'folder') {
    return <FolderIcon color="primary" />;
  }

  if (!src) {
    return <InsertDriveFileIcon color="action" />;
  }

  return (
    <Box
      component="img"
      src={src}
      alt=""
      sx={{
        width: 36,
        height: 36,
        objectFit: 'cover',
        borderRadius: 1,
        border: '1px solid #d8dde6'
      }}
    />
  );
};

export default Thumbnail;
