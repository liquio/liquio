import React from 'react';
import { useTranslate } from 'react-translate';
import { Tooltip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ConfirmDialog from 'components/ConfirmDialog';
import theme from 'theme';
import { ReactComponent as ClearIcon } from 'assets/img/clearDataIcon.svg';

const ClearDataButton = ({ clearData, actions = {}, disabled, classes }) => {
  const t = useTranslate('Elements');
  const [open, setOpen] = React.useState(false);

  const { defaultLayout } = theme;

  return (
    <>
      {defaultLayout ? (
        <div className={classes.iconWrapper}>
          <IconButton
            onClick={() => setOpen(true)}
            disabled={disabled}
            aria-label={t('ClearData')}
          >
            <ClearIcon />
          </IconButton>
          <p className={classes.iconTitle}>{t('ClearAllData')}</p>
        </div>
      ) : (
        <Tooltip title={t('ClearData')}>
          <IconButton
            onClick={() => setOpen(true)}
            disabled={disabled}
            aria-label={t('ClearData')}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      )}

      <ConfirmDialog
        open={open}
        title={t('ClearData')}
        description={t('ClearDataPrompt')}
        handleClose={() => setOpen(false)}
        handleConfirm={async () => {
          setOpen(false);
          await clearData();
          actions.clearErrors && actions.clearErrors();
        }}
      />
    </>
  );
};

export default ClearDataButton;
