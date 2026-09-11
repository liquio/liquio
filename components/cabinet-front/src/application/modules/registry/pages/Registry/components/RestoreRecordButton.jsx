import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import moment from 'moment';
import { generateUUID } from 'utils/uuid';
import {
  Template,
  TemplatePlaceholder,
  Plugin,
  TemplateConnector
} from '@devexpress/dx-react-core';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormHelperText,
  Typography
} from '@mui/material';
import classNames from 'classnames';

import { requestRegisterKeyRecords } from 'application/actions/registry';
import ConfirmDialog from 'components/ConfirmDialog';
import KeyboardDatePicker from 'components/KeyboardDatePicker/index.jsx';
import StringElement from 'components/JsonSchema/elements/StringElement/index.jsx';
import Message from 'components/Snackbars/Message';
import { restoreRegistry, checkRestoreRegisterStatus } from 'actions/registry';
import { addMessage } from 'actions/error';
import ProgressLine from 'components/Preloader/ProgressLine';

const RestoreRecordButton = ({ t, classes, actions, selectedKey }) => {
  const [openDialog, setOpenDialog] = React.useState(false);
  const [date, setDate] = React.useState(null);
  const [time, setTime] = React.useState(null);
  const [fullDate, setFullDate] = React.useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [processingResult, setProcessingResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const handleCloseProcess = () => {
    setDate(null);
    setTime(null);
    setError(false);
    setOpenConfirmDialog(false);
    setProcessingResult(null);
    setOpenDialog(false);
  };

  const formatChars = JSON.parse('{"9": "[0-9]","H": "[0-2]","M": "[0-5]","S": "[0-5]"}');
  const mask = 'H9:M9:S9';

  const handleStartProcess = () => setOpenDialog(true);

  const confirmDate = () => {
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
  };

  const checkProcessingStatus = (rollbackId) => {
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
  };

  const handleConfirm = async () => {
    setOpenConfirmDialog(false);

    setLoading(true);

    const result = await actions.restoreRegistry({
      keyId: selectedKey?.id,
      timePoint: fullDate
    });

    if (result instanceof Error) {
      actions.addMessage(new Message('FailRestoringRegisters', 'error'));
      throw new Error('FailRestoringRegisters');
    }

    const { rollbackId } = result;

    checkProcessingStatus(rollbackId);
  };

  const renderStatusInformation = () => {
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
          {status ? (
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
          ) : (
            t('Rollbacked')
          )}
        </Typography>

        <Typography>
          {t('timePoint')}
          {timePoint ? moment(timePoint).format('DD.MM.YYYY HH:mm:ss') : null}
        </Typography>

        {details &&
          Object.keys(details).length &&
          (Object.keys(details) || []).map((key) => {
            const value = details[key];

            return (
              <>
                {value || typeof value === 'number' ? (
                  <Typography key={generateUUID()}>{t(key, { value })}</Typography>
                ) : null}
              </>
            );
          })}
      </>
    );
  };

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
    <Plugin name="RestoreRecordButton">
      <Template name="toolbarContent">
        <TemplatePlaceholder />
        <TemplateConnector>
          {() => (
            <>
              {Object.entries(selectedKey?.access).every(([key, value]) => {
                if (key === 'hideKey') return true;
                return value === true;
              }) && selectedKey?.lock === false ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleStartProcess}
                  className={classes.restoreButton}
                >
                  {t('RestoreRecord')}
                </Button>
              ) : null}

              <Dialog
                open={openDialog}
                onClose={handleCloseProcess}
                fullWidth={true}
                maxWidth={'sm'}
                scroll={'body'}
                classes={{
                  paper: classes.restoreButtonDialog
                }}
              >
                <div className={classes.restoreButtonWrapper}>
                  <DialogTitle className={classes.restoreButtonTitle}>
                    {t('RestoreDialogTitle')}
                  </DialogTitle>
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
                        mask={mask}
                        formatChars={formatChars}
                      />
                      {error ? (
                        <FormHelperText className={classes.requiredFieldError}>
                          {t(error)}
                        </FormHelperText>
                      ) : null}
                    </div>
                  </DialogContent>
                  <DialogActions className={classes.restoreButtonActions}>
                    <Button
                      variant="outlined"
                      color="primary"
                      disabled={loading}
                      onClick={handleCloseProcess}
                      className={classes.cancelBtn}
                    >
                      {t('Cancel')}
                    </Button>

                    <Button
                      variant="contained"
                      color="primary"
                      onClick={confirmDate}
                      disabled={loading || error}
                      classes={{
                        root: classes.restoreButtonPadding
                      }}
                    >
                      {t('RestoreRecord')}
                    </Button>
                  </DialogActions>
                </div>
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
                <DialogTitle className={classes.dialogTitle}>
                  {t(loading ? 'Processing' : 'ProcessingComplete')}
                </DialogTitle>
                <DialogContent>
                  {renderStatusInformation()}
                  <ProgressLine loading={loading} />
                </DialogContent>
                <DialogActions className={classes.dialogActionRoot}>
                  <Button disabled={loading} onClick={handleCloseProcess}>
                    {t('Close')}
                  </Button>
                </DialogActions>
              </Dialog>
            </>
          )}
        </TemplateConnector>
      </Template>
    </Plugin>
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
