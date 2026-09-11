import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { useTranslate } from 'react-translate';
import queue from 'queue';
import {
  Dialog,
  Typography,
  Button,
  DialogTitle,
  DialogActions,
  DialogContent
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import classNames from 'classnames';
import Preloader from 'components/Preloader';
import { checkImportPreparingStatus } from 'application/actions/registry';
import { getApiUrl } from 'services/api';
import storage from 'helpers/storage';
import { readFileAsync } from 'helpers/parseFile';
import DownloadIcon from 'assets/icons/gg_import.svg';
import RenderOneLine from 'helpers/renderOneLine';
import { generateUUID } from 'utils/uuid';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';

const withStyles = makeStyles(() => ({
  dialogTitle: {
    fontSize: 32,
    marginBottom: 50
  },
  listWrapper: {
    marginLeft: 50
  },
  keysList: {
    listStyle: 'none',
    marginBottom: 35
  },
  keysListItem: {
    display: 'flex',
    '& div': {
      display: 'inline-block',
      marginRight: 15
    },
    marginBottom: 10
  },
  dialogActionRoot: {
    marginTop: 20
  },
  detailsWrapper: {
    marginBottom: 20
  },
  centerText: {
    textAlign: 'center',
    marginBottom: 16
  },
  detailsResultWrapper: {
    marginLeft: 40
  },
  marginBottom: {
    marginBottom: 0
  },
  marginTop: {
    marginTop: 40
  },
  statusWrapper: {
    padding: '2px 5px',
    borderRadius: 4,
    marginTop: 5,
    display: 'inline-block'
  },
  statusSuccess: {
    backgroundColor: '#BB86FC'
  },
  statusFailed: {
    backgroundColor: '#f44336'
  },
  preloaderWrapper: {
    paddingBottom: 16
  }
}));

const STATUSES = {
  processing: 'Importing',
  imported: 'Imported',
  failed: 'Failed'
};

const ImportRegisterKeys = ({ ColorButton, actions, loading: loadingOrigin }) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [importingStatus, setStatus] = React.useState([]);
  const [filesInfo, setFileInfo] = React.useState([]);
  const [openImportDialog, setOpenImportDialog] = React.useState(false);
  const [, setRerender] = React.useState(false);

  const classes = withStyles();

  const t = useTranslate('RegistryListAdminPage');

  const dispatch = useDispatch();

  const ref = React.useRef(null);

  const queueFactory = React.useMemo(
    () =>
      queue({
        autostart: true,
        concurrency: 1
      }),
    []
  );

  const startPreparing = () => ref.current.click();

  const handleOpenImportDialog = async ({ target }) => {
    setOpen(true);

    const files = target.files;

    const filesData = [];

    for (let i = 0; i < files.length; i++) {
      const file = await readFileAsync(files[i]);

      if (file instanceof Error) {
        actions.addMessage(new Message('FailUploadingAttachment', 'error'));
        console.log(file);
        setOpen(false);
        return;
      }

      const fileInfo = {
        id: file.key.id,
        name: file.key.name,
        registerId: file.register.id,
        registerName: file.register.name,
        file: files[i]
      };

      filesData.push(fileInfo);
    }

    setFileInfo(filesData);
  };

  const handleClose = () => {
    setStatus([]);
    setLoading(false);
    setOpen(false);
    setOpenImportDialog(false);
  };

  const checkProcessingStatus = (importId, fileInfo) => {
    const interval = setInterval(async () => {
      queueFactory.push(async () => {
        const processing = await dispatch(checkImportPreparingStatus(importId));

        if (processing instanceof Error) {
          clearInterval(interval);
          return;
        }

        const { status } = processing;

        importingStatus.push({
          ...processing,
          fileInfo
        });

        const uniqProcessingItems = importingStatus.reduce((acc, item) => {
          const { importId } = item;
          return {
            ...acc,
            [importId]: item
          };
        }, {});

        const uniqProcessingItemsValues = Object.values(uniqProcessingItems);

        setStatus(uniqProcessingItemsValues);

        if (status === STATUSES.failed) {
          setLoading(false);
          clearInterval(interval);
          setRerender({});
          return;
        }

        if (uniqProcessingItemsValues.every(({ status }) => status === STATUSES.imported)) {
          setLoading(false);
          clearInterval(interval);
          setRerender({});
        }
      });
    }, 1000);
  };

  const handleChange = async () => {
    try {
      setLoading(true);
      setOpen(false);
      setOpenImportDialog(true);

      filesInfo.forEach(async (fileInfo) => {
        queueFactory.push(async () => {
          const result = await fetch(`${getApiUrl()}register-proxy/admin/import/start`, {
            method: 'post',
            headers: {
              'Content-Type': 'application/json',
              token: storage.getItem('token')
            },
            body: fileInfo.file
          });

          if (result?.status === 200) {
            const {
              data: { importId }
            } = await result.json();
            checkProcessingStatus(importId, fileInfo);
            return;
          }

          handleClose();
        });
      });
    } catch {
      handleClose();
    }
  };

  const renderStatusInformation = () => (
    <>
      {importingStatus.map(({ details, status, fileInfo }, i) => {
        const isSuccess = status === STATUSES.imported;
        const isFailed = status === STATUSES.failed;

        return (
          <div className={classes.listWrapper} key={generateUUID()}>
            <Typography
              className={classNames({
                [classes.keysListItem]: true,
                [classes.marginBottom]: true,
                [classes.marginTop]: i !== 0
              })}
            >
              <div>{t('Register', { value: fileInfo?.registerId })}</div>
              <RenderOneLine title={fileInfo?.registerName} />
            </Typography>

            <Typography className={classes.keysListItem}>
              <div>{t('Key', { value: fileInfo?.id })}</div>
              <RenderOneLine title={fileInfo?.name} />
            </Typography>

            <div className={classes.detailsResultWrapper}>
              <Typography>
                {isSuccess ? t('ProcessingImportStatus') : null}
                {isFailed ? t('ProcessingImportStatusFailed') : null}
              </Typography>

              <Typography>{t('ImportDetails')}</Typography>

              {(Object.keys(details) || []).map((key) => {
                const value = details[key];

                return (
                  <>
                    {value || typeof value === 'number' ? (
                      <Typography key={generateUUID()}>{t(key, { value })}</Typography>
                    ) : null}
                  </>
                );
              })}

              <Typography>
                <span
                  className={classNames({
                    [classes.statusWrapper]: true,
                    [classes.statusSuccess]: isSuccess,
                    [classes.statusFailed]: isFailed
                  })}
                >
                  {t('Status', { value: t(status) })}
                </span>
              </Typography>
            </div>
          </div>
        );
      })}
    </>
  );

  const renderFilesInfo = () => {
    const groupedFilesInfo = filesInfo.reduce((acc, fileInfo) => {
      const { registerId } = fileInfo;
      return {
        ...acc,
        [registerId]: [...(acc[registerId] || []), fileInfo]
      };
    }, {});

    return (
      <>
        {Object.keys(groupedFilesInfo).map((registerId) => {
          return (
            <div key={registerId} className={classes.listWrapper}>
              <Typography className={classes.keysListItem}>
                <div>{t('Register', { value: registerId })}</div>
                <RenderOneLine title={groupedFilesInfo[registerId][0].registerName} />
              </Typography>

              <ul className={classes.keysList}>
                {groupedFilesInfo[registerId].map((fileInfo) => {
                  return (
                    <li key={fileInfo.id} className={classes.keysListItem}>
                      <div>{t('Key', { value: fileInfo.id })}</div>
                      <RenderOneLine title={fileInfo.name} />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </>
    );
  };

  return (
    <>
      <ColorButton
        variant="contained"
        color="primary"
        onClick={startPreparing}
        disabled={loadingOrigin}
      >
        <img src={DownloadIcon} alt="DownloadIcon" />
        {t('ImportRegister')}
      </ColorButton>

      <input
        ref={ref}
        type="file"
        accept=".dat"
        onChange={handleOpenImportDialog}
        hidden={true}
        multiple={true}
      />

      <Dialog
        open={openImportDialog}
        fullWidth={true}
        maxWidth="sm"
        scroll="body"
        onClose={loading ? null : handleClose}
      >
        <DialogTitle className={classes.dialogTitle}>{t('ImportRegisterKeys')}</DialogTitle>
        <DialogContent>
          {loading ? (
            <>
              <div className={classes.preloaderWrapper}>
                <Preloader />
              </div>
              <Typography className={classes.centerText}>{t('ProcessingImportActive')}</Typography>
            </>
          ) : null}
          {renderStatusInformation()}
        </DialogContent>
        <DialogActions className={classes.dialogActionRoot}>
          <Button onClick={handleClose} disabled={loading}>
            {t('CloseKeysDialog')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} fullWidth={true} maxWidth="sm" onClose={handleClose} scroll="body">
        <DialogTitle className={classes.dialogTitle}>{t('ImportRegisterKeys')}</DialogTitle>

        <DialogContent>
          {renderFilesInfo()}
          {loading ? <Typography>{t('ProcessingImport')}</Typography> : null}
        </DialogContent>

        <DialogActions className={classes.dialogActionRoot}>
          <Button onClick={handleClose}>{t('CloseKeysDialog')}</Button>
          <Button variant="contained" color="primary" onClick={handleChange}>
            {t('ImportRegisters')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

ImportRegisterKeys.propTypes = {
  ColorButton: PropTypes.node.isRequired
};

const mapDispatchToProps = (dispatch) => ({
  actions: {
    addMessage: bindActionCreators(addMessage, dispatch)
  }
});

const connected = connect(null, mapDispatchToProps)(ImportRegisterKeys);
export default connected;
