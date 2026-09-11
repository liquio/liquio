import React from 'react';
import { useTranslate } from 'react-translate';
import { Tooltip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import ConfirmDialog from 'components/ConfirmDialog';
import { ChangeEvent } from 'components/JsonSchema';

const ClearDataButton = ({ onChange, data, readOnly, actions = {} }) => {
  const t = useTranslate('Elements');
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Tooltip title={t('ClearData')}>
        <div>
          <IconButton
            onClick={() => setOpen(true)}
            disabled={!data || !data.length || readOnly}
            size="large"
          >
            <DeleteIcon />
          </IconButton>
        </div>
      </Tooltip>
      <ConfirmDialog
        open={open}
        title={t('ClearData')}
        description={t('ClearDataPrompt')}
        handleClose={() => setOpen(false)}
        handleConfirm={async () => {
          setOpen(false);
          await onChange(new ChangeEvent([], true));
          actions.clearErrors && actions.clearErrors();
        }}
      />
    </>
  );
};

export default ClearDataButton;
