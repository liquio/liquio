import ManageHistoryIcon from '@mui/icons-material/ManageHistory';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  Typography
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import moment from 'moment';
import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import uuid from 'uuid-random';

import { addMessage } from 'actions/error';
import { checkRestoreRegisterStatus, restoreRegistry } from 'actions/registry';
import { requestRegisterKeyRecords } from 'application/actions/registry';
import classNames from 'classnames';
import ConfirmDialog from 'components/ConfirmDialog';
import StringElement from 'components/JsonSchema/elements/StringElement/index.jsx';
import KeyboardDatePicker from 'components/KeyboardDatePicker/index.jsx';
import ProgressLine from 'components/Preloader/ProgressLine';
import Message from 'components/Snackbars/Message';
import { ReactComponent as CloseIcon } from './assets/close.svg';

const styles = () => ({
  status: {
    color: '#000000',
    padding: 3
  },
  Rollbacked: {
    backgroundColor: '#19BE6F'
  },
  Failed: {
    backgroundColor: '#FA594F'
  },
  Rollbacking: {
    backgroundColor: '#FFD600'
  },
  dialogActions: {
    padding: '16px 20px'
  },
  icon: {
    color: '#FFFFFF'
  }
});

const useStyles = makeStyles(styles);

const RestoreRecordButton = ({ t, actions, selectedKey }) => {
  const [openDialog, setOpenDialog] = React.useState(false);
  const [date, setDate] = React.useState(null);
  const [time, setTime] = React.useState(null);
  const [fullDate, setFullDate] = React.useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [processingResult, setProcessingResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const classes = useStyles();

  const handleCloseProcess = React.useCallback(() => {
    setDate(null);
    setTime(null);
    setError(false);
    setOpenConfirmDialog(false);
    setProcessingResult(null);
    setOpenDialog(false);
  }, []);

  const formatChars = React.useMemo(
    () => JSON.parse('{"9": "[0-9]","H": "[0-2]","M": "[0-5]","S": "[0-5]"}'),
    []
  );
  const mask = React.useMemo(() => 'H9:M9:S9', []);

  const handleStartProcess = React.useCallback(() => {
    setOpenDialog(true);
  }, []);

  const confirmDate = React.useCallback(() => {
    const restoreDate = moment(date?.value, 'DD MMMM YYYY').format('YYYY-MM-DD') + 'T' + time;
    const formateDate = moment(restoreDate).utcOffset(180);
    const currentMoment = moment();
    setFullDate(moment(restoreDate).toISOString());

    if (formateDate.isAfter(currentMoment)) {
      setError('TimeError');
      return;
    }
    if (!date || !time) {
      setError('RequiredDateField');
      return;
    }

    const timeParts = time?.split(':');
    const hours = parseInt(timeParts[0], 10);

    if (hours > 23) {
      setError('InvalidHour');
      return;
    }

    setOpenDialog(false);
    setOpenConfirmDialog(true);
  }, [date, time]);

  const checkProcessingStatus = React.useCallback(
    (rollbackId) => {
      const interval = setInterval(async () => {
        const stopInterval = () => {
          clearInterval(interval);
          setLoading(false);
        };

        const processing = await actions.checkRestoreRegisterStatus(rollbackId);

        if (processing instanceof Error) {
          actions.addMessage(new Message('FailExportingRegisters', 'error'));
          setProcessingResult(null);
          stopInterval();
          throw new Error('FailExportingRegisters');
        }

        setProcessingResult(processing);

        if (processing?.status === 'Rollbacked') {
          stopInterval();
        }

        if (processing?.status === 'Failed') {
          stopInterval();
        }
      }, 10000);
    },
    [actions]
  );

  const handleConfirm = React.useCallback(async () => {
    setOpenConfirmDialog(false);

    setLoading(true);

    const result = await actions.restoreRegistry({
      keyId: selectedKey?.id,
      timePoint: fullDate
    });

    if (result instanceof Error) {
      actions.addMessage(new Message(result?.message || 'FailRestoringRegisters', 'error'));
      setLoading(false);
      setOpenConfirmDialog(false);
      return;
    }

    const { rollbackId } = result;

    checkProcessingStatus(rollbackId);
  }, [actions, fullDate, selectedKey, checkProcessingStatus]);

  const renderStatusInformation = React.useCallback(() => {
    if (!processingResult) return null;

    const { details, status, timePoint, keyId } = processingResult;

    return (
      <>
        <Typography>
          {t('keyId')}
          {keyId}
        </Typography>

        <Typography>
          {t('Status')}
          <span
            className={classNames({
              [classes.status]: true,
              [classes.Rollbacked]: status === 'Rollbacked',
              [classes.Failed]: status === 'Failed',
              [classes.Rollbacking]: status === 'Rollbacking'
            })}
          >
            {t(status)}
          </span>
        </Typography>

        <Typography>
          {t('timePoint')}
          {moment(timePoint).format('DD.MM.YYYY HH:mm:ss')}
        </Typography>

        {(Object.keys(details) || []).map((key) => {
          const value = details[key];

          return (
            <>
              {value || typeof value === 'number' ? (
                <Typography key={uuid()}>{t(key, { value })}</Typography>
              ) : null}
            </>
          );
        })}
      </>
    );
  }, [processingResult, t, classes]);

  const access = React.useMemo(() => {
    return (
      Object.values(selectedKey?.access).every((value) => value === true) &&
      selectedKey?.lock === false
    );
  }, [selectedKey]);

  const validateDate = (newDate, newTime) => {
    const restoreDate = moment(newDate, 'DD MMMM YYYY').format('YYYY-MM-DD') + 'T' + newTime;
    const formateDate = moment(restoreDate).utcOffset(180);

    if (formateDate.isAfter(moment()) || formateDate.isBefore(moment().subtract(1, 'week'))) {
      setError('InvalidTimeRange');
    } else {
      setError(false);
    }
  };

  const handleChangeDate = (newValue) => {
    validateDate(newValue?.value, time);
    setDate(newValue);
  };

  const handleChangeTime = (newValue) => {
    validateDate(date?.value, newValue);
    setTime(newValue);
  };

  return (
    <>
      {access ? (
        <Button onClick={handleStartProcess} startIcon={<ManageHistoryIcon />}>
          {t('RestoreRecord')}
        </Button>
      ) : null}

      <Dialog
        open={openDialog}
        onClose={handleCloseProcess}
        fullWidth={true}
        maxWidth={'sm'}
        scroll={'body'}
      >
        <DialogTitle>{t('RestoreDialogTitle')}</DialogTitle>
        <DialogContent>
          <div className={classes.picker}>
            <KeyboardDatePicker
              label={'Label'}
              value={date ? moment(date) : null}
              onChange={(newValue) => handleChangeDate(newValue)}
              minDate={moment().subtract(1, 'week')}
              maxDate={moment()}
            />
            <StringElement
              label={'Time'}
              value={time}
              onChange={(newValue) => handleChangeTime(newValue)}
              description={t('TimeFormat')}
              required={true}
              noMargin={true}
              mask={mask}
              formatChars={formatChars}
            />
            {error ? (
              <FormHelperText variant="standard" error={true}>
                {t(error)}
              </FormHelperText>
            ) : null}
          </div>
        </DialogContent>
        <DialogActions
          classes={{
            root: classes.dialogActions
          }}
        >
          <Button
            variant="contained"
            onClick={confirmDate}
            disabled={loading || error}
            startIcon={<ManageHistoryIcon className={classes.icon} />}
          >
            {t('RestoreRecord')}
          </Button>
          <Button startIcon={<CloseIcon />} disabled={loading} onClick={handleCloseProcess}>
            {t('Cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        fullScreen={false}
        open={openConfirmDialog}
        title={t('Attention')}
        description={t('RestoreConfirm', {
          date: moment(date?.value, 'DD MMMM YYYY').format('DD.MM.YYYY') + ' ' + time
        })}
        handleClose={handleCloseProcess}
        handleConfirm={handleConfirm}
        acceptButtonText={t('RestoreRecordConfirm')}
      />

      <Dialog
        open={processingResult || loading}
        fullWidth={true}
        maxWidth="sm"
        scroll="body"
        onClose={handleCloseProcess}
      >
        <DialogTitle>{t(loading ? 'Processing' : 'ProcessingComplete')}</DialogTitle>
        <DialogContent>
          {renderStatusInformation()}
          <ProgressLine loading={loading} />
        </DialogContent>
        <DialogActions
          classes={{
            root: classes.dialogActions
          }}
        >
          <Button disabled={loading} onClick={handleCloseProcess}>
            {t('Close')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

RestoreRecordButton.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  selectedKey: PropTypes.object.isRequired
};

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestRegisterKeyRecords: bindActionCreators(requestRegisterKeyRecords, dispatch),
    restoreRegistry: bindActionCreators(restoreRegistry, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
    checkRestoreRegisterStatus: bindActionCreators(checkRestoreRegisterStatus, dispatch)
  }
});

const translated = translate('RegistryPage')(RestoreRecordButton);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
