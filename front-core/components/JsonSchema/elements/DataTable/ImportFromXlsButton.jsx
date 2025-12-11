import React from 'react';

import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { IconButton, Tooltip } from '@mui/material';
import { useTranslate } from 'react-translate';
import readXLSXFile from 'helpers/readXLSXFile';

const ImportFromXlsButton = ({ onImport, readOnly }) => {
  const t = useTranslate('Elements');
  const inputRef = React.useRef();

  const handleChange = async ({
    target: {
      files: [file],
    },
  }) => {
    try {
      onImport(await readXLSXFile(file));
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <>
      <Tooltip title={t('Import')}>
        <IconButton
          disabled={readOnly}
          onClick={() => inputRef.current.click()}
          size="large"
          aria-label={t('Import')}
        >
          <FolderOpenIcon />
        </IconButton>
      </Tooltip>
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        accept=".xlsx,.xls"
        onChange={handleChange}
      />
    </>
  );
};

export default ImportFromXlsButton;
