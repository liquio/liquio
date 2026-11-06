import React from 'react';

import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { IconButton, Tooltip } from '@mui/material';
import { useTranslate } from 'react-translate';
import readXLSXFile from 'helpers/readXLSXFile';

interface ImportFromXlsButtonProps {
  onImport: (data: unknown[]) => void;
  readOnly?: boolean;
}

const ImportFromXlsButton = ({ onImport, readOnly }: ImportFromXlsButtonProps) => {
  const t = useTranslate('Elements');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = async ({
    target: {
      files,
    },
  }: React.ChangeEvent<HTMLInputElement>) => {
    const [file] = files as FileList;
    try {
      onImport(
        await readXLSXFile(file, {
          removeEmptyRows: true,
        }),
      );
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <>
      <Tooltip title={t('Import')}>
        <IconButton
          disabled={readOnly}
          onClick={() => inputRef.current?.click()}
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
