import React from 'react';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { IconButton, Tooltip } from '@mui/material';
import { useTranslate } from 'react-translate';
import readXLSXFile from 'helpers/readXLSXFile';
import theme from 'theme';
import { ReactComponent as ImportIcon } from 'assets/img/importIcon.svg';

const ImportButton = ({ onImport, disabled, classes }) => {
  const t = useTranslate('Elements');
  const inputRef = React.useRef();

  const handleChange = async ({
    target: {
      files: [file],
    },
  }) => {
    try {
      onImport(await readXLSXFile(file));
      inputRef.current.value = '';
    } catch (e) {
      console.log(e);
    }
  };

  const { defaultLayout } = theme;

  return (
    <>
      {defaultLayout ? (
        <div className={classes.iconWrapper}>
          <IconButton
            disabled={disabled}
            onClick={() => inputRef.current.click()}
            aria-label={t('Import')}
          >
            <ImportIcon />
          </IconButton>
          <p className={classes.iconTitle}>{t('Import')}</p>
        </div>
      ) : (
        <Tooltip title={t('Import')}>
          <IconButton
            disabled={disabled}
            onClick={() => inputRef.current.click()}
            aria-label={t('Import')}
          >
            <FolderOpenIcon />
          </IconButton>
        </Tooltip>
      )}

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

export default ImportButton;
