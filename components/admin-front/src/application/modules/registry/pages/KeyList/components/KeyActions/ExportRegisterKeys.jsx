import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { useTranslate } from 'react-translate';
import queue from 'queue';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { makeStyles } from '@mui/styles';
import Preloader from 'components/Preloader';
import Message from 'components/Snackbars/Message';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import {
  checkExportPreparingStatus,
  downloadPreparedRegister,
  startPreparingExport,
} from 'application/actions/registry';
import { addMessage } from 'actions/error';
import ExportIcon from 'assets/icons/gg_export.svg';
import arrayUnique from 'helpers/arrayUnique';
import { SchemaForm, handleChangeAdapter } from 'components/JsonSchema';

const withStyles = makeStyles((theme) => ({
  checkbox: {
    '& svg': {
      fill: theme.palette.primary.main,
    },
  },
  dialogTitle: {
    fontSize: 32,
  },
  formWrapper: {
    marginLeft: -10,
  },
  labelWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  typographyRoot: {
    display: 'inline-block',
    width: '100%',
  },
  labelItemId: {
    marginRight: 30,
  },
  noDataWrapper: {
    padding: 11,
  },
  preloaderWrapper: {
    paddingTop: 16,
  },
  preloaderTitle: {
    padding: 16,
  },
}));

const ExportRegisterKeys = ({
  registerId,
  importActions,
  ColorButton,
  data,
  loading: loadingOrigin,
}) => {
  const t = useTranslate('RegistryListAdminPage');
  const [loading, setLoading] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [checked, setChecked] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [onlySchema, setOnlySchema] = React.useState({});
  const [error, setError] = React.useState(false);
  const classes = withStyles();

  const queueFactory = React.useMemo(
    () =>
      queue({
        autostart: true,
        concurrency: 1,
      }),
    [],
  );

  const downloadRegisterKey = async (exportId, keyId) => {
    const blob = await importActions.downloadPreparedRegister(exportId);

    if (blob instanceof Error) {
      importActions.addMessage(new Message('FailExportingRegisters', 'error'));
      return;
    }

    downloadBase64Attach(
      { fileName: `register-${registerId}-${keyId}.dat` },
      blob,
    );

    const isLastCheckedKeyId = checked[checked.length - 1] === keyId;

    if (isLastCheckedKeyId) {
      setLoading(false);
      setDownloading(false);
      importActions.addMessage(
        new Message('ExportRegistersSuccess', 'success'),
      );
    }
  };

  const checkProcessingStatus = (exportId, keyId) => {
    const interval = setInterval(() => {
      queueFactory.push(async () => {
        const processing =
          await importActions.checkExportPreparingStatus(exportId);

        if (processing instanceof Error) {
          importActions.addMessage(
            new Message('FailExportingRegisters', 'error'),
          );
          clearInterval(interval);
          throw new Error('FailExportingRegisters');
        }

        const { status } = processing;

        if (status !== 'Prepared') return;

        clearInterval(interval);

        setDownloading(true);

        downloadRegisterKey(exportId, keyId);
      });
    }, 10000);
  };

  const startPreparing = async () => {
    if (checked.length === 0) {
      setError('SelectRegisterToExport');
      return;
    }

    setLoading(true);
    handleClose();
    setError(false);

    checked.forEach((keyId) => {
      queueFactory.push(async () => {
        const body = {
          keyId,
        };

        if (!onlySchema.checked) {
          body.options = {
            onlySchema: true,
          };
        }

        const result = await importActions.startPreparingExport(body);

        if (result instanceof Error) {
          importActions.addMessage(
            new Message('FailExportingRegisters', 'error'),
          );
          throw new Error('FailExportingRegisters');
        }

        const { exportId } = result;

        checkProcessingStatus(exportId, keyId);
      });
    });
  };

  const handleOnlySchemaChange = (event) => {
    setOnlySchema(event);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setOnlySchema({});
    setChecked([]);
  };

  const handleCheck = (event, name) => {
    if (event.target.checked) {
      setChecked(arrayUnique(checked.concat([name])));
    } else {
      setChecked(checked.filter((item) => item !== name));
    }
  };

  const renderLabel = (item) => (
    <div className={classes.labelWrapper}>
      <Typography className={classes.labelItemId}>{item.id}</Typography>
      <Typography>{item.name}</Typography>
    </div>
  );

  const keysExist = (data || []).length > 0;

  return (
    <>
      <ColorButton
        variant="contained"
        color="primary"
        onClick={handleOpen}
        disabled={loadingOrigin}
      >
        <img src={ExportIcon} alt="ExportIcon" />
        {t('ExportRegister')}
      </ColorButton>

      <Dialog open={loading}>
        <div className={classes.preloaderWrapper}>
          <Preloader />
        </div>
        <Typography className={classes.preloaderTitle}>
          {t(downloading ? 'DownloadingExport' : 'ProcessingExport')}
        </Typography>
      </Dialog>

      <Dialog open={open} fullWidth={true} maxWidth="sm" onClose={handleClose}>
        <DialogTitle className={classes.dialogTitle}>
          {t('ExportRegisterSettingsDialog')}
        </DialogTitle>
        <DialogContent>
          <FormGroup error={!!error}>
            {keysExist ? (
              <>
                {(data || []).map((item) => (
                  <FormControlLabel
                    key={item.id}
                    classes={{ label: classes.typographyRoot }}
                    control={
                      <Checkbox
                        classes={{
                          checked: classes.checkbox,
                        }}
                      />
                    }
                    checked={checked.includes(item.id)}
                    onChange={(event) => handleCheck(event, item.id)}
                    label={renderLabel(item)}
                  />
                ))}
                <div className={classes.formWrapper}>
                  <SchemaForm
                    value={onlySchema}
                    onChange={handleChangeAdapter(
                      onlySchema,
                      handleOnlySchemaChange,
                    )}
                    schema={{
                      type: 'object',
                      properties: {
                        checked: {
                          control: 'toggle',
                          onText: t('ExportRegisterWithData'),
                        },
                      },
                    }}
                  />
                </div>
              </>
            ) : (
              <Typography className={classes.noDataWrapper}>
                {t('NoKeysForExport')}
              </Typography>
            )}
            {error ? (
              <FormHelperText error={true}>{t(error)}</FormHelperText>
            ) : null}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{t('Cancel')}</Button>
          {keysExist ? (
            <Button
              onClick={startPreparing}
              color="primary"
              variant="contained"
            >
              {t('Export')}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </>
  );
};

ExportRegisterKeys.propTypes = {
  registerId: PropTypes.string.isRequired,
  importActions: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
  data: PropTypes.array,
};

ExportRegisterKeys.defaultProps = {
  data: [],
};

const mapDispatchToProps = (dispatch) => ({
  importActions: {
    checkExportPreparingStatus: bindActionCreators(
      checkExportPreparingStatus,
      dispatch,
    ),
    downloadPreparedRegister: bindActionCreators(
      downloadPreparedRegister,
      dispatch,
    ),
    startPreparingExport: bindActionCreators(startPreparingExport, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});

export default connect(null, mapDispatchToProps)(ExportRegisterKeys);
