import {
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogTitle,
  FormControlLabel,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslate } from 'react-translate';

import * as api from 'services/api';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import downloadBase64Attach from 'helpers/downloadBase64Attach';

import { RegisterKeyTable } from './RegisterKeyTable';

const useStyles = makeStyles(() => ({
  flexGrow: {
    flexGrow: 1,
  },
  checkbox: {
    marginLeft: 0,
  },
}));

export const ExportRegistryDialog = ({ register, open, onClose }) => {
  const t = useTranslate('RegistryListAdminPage');
  const classes = useStyles();
  const dispatch = useDispatch();

  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [withData, setWithData] = React.useState(true);
  const [selectedKeys, setSelectedKeys] = React.useState([]);

  const busyOrLoading = useMemo(() => busy || loading, [busy, loading]);

  const handleExport = useCallback(async () => {
    if (busy) {
      return;
    }

    try {
      setLoading(true);
      const blob = await api.get(
        `registers/${
          register.id
        }/stream-export?with_data=${withData}&file=true&key_ids=${selectedKeys.join()}`,
        'EXPORT_REGISTERS',
        dispatch,
      );

      downloadBase64Attach(
        {
          fileName: `register-${register.name}-${register.id}_stream.bpmn`,
        },
        blob,
      );
    } catch (e) {
      addMessage(new Message('FailExportingRegisters', 'error', e.message));
    }

    setLoading(false);
  }, [busy, dispatch, register.id, register.name, selectedKeys, withData]);

  const handleClose = useCallback(() => {
    if (busyOrLoading) {
      return;
    }
    onClose();
  }, [busyOrLoading, onClose]);

  const handleSelectKeys = useCallback((keys) => {
    setSelectedKeys(keys);
  }, []);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      scroll="body"
      fullWidth={true}
    >
      <DialogTitle>{t('ExportRegisterTitle', register)}</DialogTitle>
      <RegisterKeyTable
        busy={busyOrLoading}
        setBusy={setBusy}
        register={register}
        selectedKeys={selectedKeys}
        setSelectedKeys={handleSelectKeys}
      />
      <DialogActions className={classes.actions}>
        <FormControlLabel
          className={classes.checkbox}
          disabled={busyOrLoading}
          control={
            <Checkbox
              checked={withData}
              onChange={(e) => setWithData(e.target.checked)}
            />
          }
          label={t('ExportRegisterWithData')}
        />
        <div className={classes.flexGrow} />
        {loading ? (
          <CircularProgress size={24} className={classes.progress} />
        ) : null}
        <Button disabled={busyOrLoading} onClick={handleClose} color="primary">
          {t('Cancel')}
        </Button>
        <Button
          disabled={busyOrLoading || !selectedKeys.length}
          onClick={handleExport}
          color="primary"
          variant="contained"
        >
          {t('ExportRegister')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
