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
import { Theme } from '@mui/material/styles';
import { makeStyles } from '@mui/styles';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';
import { generateUUID } from 'utils/uuid';

import { addMessage } from 'actions/error';
import { checkRestoreRegisterStatus, restoreRegistry } from 'actions/registry';
import { requestRegisterKeyRecords } from 'application/actions/registry';
import classNames from 'classnames';
import ConfirmDialogRaw from 'components/ConfirmDialog';
import StringElementRaw from 'components/JsonSchema/elements/StringElement';
import KeyboardDatePickerRaw from 'components/KeyboardDatePicker';
import ProgressLineRaw from 'components/Preloader/ProgressLine';
import Message from 'components/Snackbars/Message';
import { ReactComponent as CloseIcon } from './assets/close.svg';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ProgressLine = ProgressLineRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: Theme) => ({
  status: {
    color: theme?.palette?.text?.primary,
    padding: 3
  },
  Rollbacked: {
    backgroundColor: theme?.palette?.success?.main
  },
  Failed: {
    backgroundColor: theme?.palette?.error?.main
  },
  Rollbacking: {
    backgroundColor: theme?.palette?.warning?.main
  },
  dialogActions: {
    padding: '16px 20px'
  },
  icon: {
    color: theme?.palette?.primary?.contrastText
  }
});

const useStyles = makeStyles(styles);

interface SelectedKey {
  id?: string | number;
  access?: Record<string, boolean>;
  lock?: boolean;
}

interface ProcessingResult {
  details: Record<string, unknown>;
  status?: string;
  timePoint?: string;
  keyId?: string | number;
}

interface DateValue {
  value?: string;
}

interface RestoreRecordButtonProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  actions: {
    checkRestoreRegisterStatus: (id: string | number) => Promise<ProcessingResult | Error>;
    restoreRegistry: (params: Record<string, unknown>) => Promise<{ rollbackId: string | number } | Error>;
    addMessage: (message: unknown) => void;
  };
  selectedKey?: SelectedKey;
}

const RestoreRecordButton = ({ t, actions, selectedKey }: RestoreRecordButtonProps) => {
  const [openDialog, setOpenDialog] = React.useState(false);
  const [date, setDate] = React.useState<DateValue | null>(null);
  const [time, setTime] = React.useState<string | null>(null);
  const [fullDate, setFullDate] = React.useState<string | null>(null);
  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);
  const [error, setError] = React.useState<string | false>(false);
  const [processingResult, setProcessingResult] = React.useState<ProcessingResult | null>(null);
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
    (rollbackId: string | number) => {
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
      actions.addMessage(new Message((result as unknown as { message?: string })?.message || 'FailRestoringRegisters', 'error'));
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
            {t(status as string)}
          </span>
        </Typography>

        <Typography>
          {t('timePoint')}
          {moment(timePoint).format('DD.MM.YYYY HH:mm:ss')}
        </Typography>

        {(Object.keys(details) || []).map((key) => {
          const value = details[key];

          return (
            <React.Fragment key={generateUUID()}>
              {value || typeof value === 'number' ? (
                <Typography>{t(key, { value })}</Typography>
              ) : null}
            </React.Fragment>
          );
        })}
      </>
    );
  }, [processingResult, t, classes]);

  const access = React.useMemo(() => {
    return (
      Object.values(selectedKey?.access || {}).every((value) => value === true) &&
      selectedKey?.lock === false
    );
  }, [selectedKey]);

  const validateDate = (newDate: string | undefined, newTime: string | null) => {
    const restoreDate = moment(newDate, 'DD MMMM YYYY').format('YYYY-MM-DD') + 'T' + newTime;
    const formateDate = moment(restoreDate).utcOffset(180);

    if (formateDate.isAfter(moment()) || formateDate.isBefore(moment().subtract(1, 'week'))) {
      setError('InvalidTimeRange');
    } else {
      setError(false);
    }
  };

  const handleChangeDate = (newValue: DateValue) => {
    validateDate(newValue?.value, time);
    setDate(newValue);
  };

  const handleChangeTime = (newValue: string) => {
    validateDate(date?.value, newValue);
    setTime(newValue);
  };

  // Deferred to inside the component rather than module scope: front-core's
  // JsonSchema element components sit on a documented circular-import chain
  // (see TYPESCRIPT.md) — a module-top-level read can run while that module
  // is still mid-evaluation.
  const StringElement = StringElementRaw as unknown as React.ComponentType<Record<string, unknown>>;
  const KeyboardDatePicker = KeyboardDatePickerRaw as unknown as React.ComponentType<Record<string, unknown>>;

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
          <div className={(classes as { picker?: string }).picker}>
            <KeyboardDatePicker
              label={'Label'}
              value={date ? moment(date as never) : null}
              onChange={(newValue: DateValue) => handleChangeDate(newValue)}
              minDate={moment().subtract(1, 'week')}
              maxDate={moment()}
            />
            <StringElement
              label={'Time'}
              value={time}
              onChange={(newValue: string) => handleChangeTime(newValue)}
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
            disabled={loading || !!error}
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
        open={!!(processingResult || loading)}
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

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    requestRegisterKeyRecords: bindActionCreators(requestRegisterKeyRecords, dispatch),
    restoreRegistry: bindActionCreators(restoreRegistry, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
    checkRestoreRegisterStatus: bindActionCreators(checkRestoreRegisterStatus, dispatch)
  }
});

const translated = translate('RegistryPage')(RestoreRecordButton as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
