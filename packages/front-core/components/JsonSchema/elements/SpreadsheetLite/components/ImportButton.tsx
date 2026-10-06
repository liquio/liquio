import React from 'react';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { IconButton, Tooltip } from '@mui/material';
import { useTranslate } from 'react-translate';
import readXLSXFile from 'helpers/readXLSXFile';
import theme from 'theme';
import { ReactComponent as ImportIcon } from 'assets/img/importIcon.svg';

interface ImportButtonProps {
  onImport: (rows: unknown[]) => void;
  disabled?: boolean;
  classes: Record<string, string>;
}

const ImportButton = ({ onImport, disabled, classes }: ImportButtonProps) => {
  const t = useTranslate('Elements');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    try {
      onImport(await readXLSXFile(file));
      event.currentTarget.value = '';
    } catch (error) {
      console.log(error);
    }
  };

  const { defaultLayout } = theme as unknown as { defaultLayout?: boolean };
  const openFileDialog = () => inputRef.current?.click();

  return (
    <>
      {defaultLayout ? (
        <div className={classes.iconWrapper}>
          <IconButton
            disabled={disabled}
            onClick={openFileDialog}
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
            onClick={openFileDialog}
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
