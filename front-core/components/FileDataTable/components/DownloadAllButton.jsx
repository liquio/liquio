import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  Menu,
  MenuItem,
  Tooltip,
  IconButton,
  CircularProgress,
  Typography,
  Button
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import PrintIcon from '@mui/icons-material/Print';
import JSZip from 'jszip';
import printJS from 'print-js';

import downloadBase64Attach from 'helpers/downloadBase64Attach';
import awaitDelay from 'helpers/awaitDelay';
import { clearDocumentAttaches } from 'actions/files';
import { requestWorkflowProcessAttachP7S } from 'actions/workflowProcess';
import theme from 'theme';
import { ReactComponent as SaveAltIcon } from 'assets/img/save_alt.svg';
import { ReactComponent as KeyIcon } from 'assets/img/ic_key.svg';
import { ReactComponent as DownloadIcon } from '../assets/ic_download.svg';

const ALLOWED_FORMATS = ['pdf', 'html', 'jpg', 'png', 'json'];
const QUEUE_DELAY = 100;

const styles = {
  paper: {
    boxShadow:
      '0px 5px 5px -3px rgb(0 0 0 / 20%), 0px 8px 10px 1px rgb(0 0 0 / 14%), 0px 3px 14px 2px rgb(0 0 0 / 12%)'
  }
};

const useStyles = makeStyles(styles);

const DownloadAllButton = ({
  rowsSelected,
  data,
  printAction,
  isRow,
  actions,
  t,
  asics: useAsics,
  hasP7sSignature,
  importActions,
  p7sDownload,
  GridActionsCellItem,
  hidden,
  isArrayOfFiles
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [downloadState, setDownloadState] = React.useState(false);

  const classes = useStyles();

  const alternativeIcons = theme?.fileDataTableTypePremium;

  const printData = ({ fileList, extention }) =>
    fileList.forEach((file) => {
      if (!file) return;

      let type = '';
      let replaceInfo = 'data:application/pdf;base64,';

      switch (extention) {
        case 'pdf': {
          type = 'pdf';
          break;
        }
        case 'html': {
          type = 'html';
          replaceInfo = '';
          break;
        }
        case 'json': {
          type = 'json';
          replaceInfo = '';
          break;
        }
        case 'png': {
          type = 'image';
          replaceInfo = '';
          break;
        }
        case 'jpg': {
          type = 'image';
          replaceInfo = '';
          break;
        }
        default: {
          break;
        }
      }

      printJS({
        printable: file.replace(replaceInfo, ''),
        type,
        base64: true
      });
    });

  const getFileP7S = React.useCallback(async () => {
    const files = data.filter(({ id }) => rowsSelected.includes(id))[0];
    try {
      setBusy(true);

      const action = actions.handleDownloadP7SFile || importActions.requestWorkflowProcessAttachP7S;

      const p7sFile = await action(files.id, {
        link: files.link,
        id: files.link
      });
      downloadBase64Attach({ fileName: files.name + '.p7s' }, p7sFile);
      setBusy(false);
    } catch (e) {
      setBusy(false);
      try {
        const error = new Error(e.response?.details[0].message);
        actions.addError(error);
      } catch {
        actions.addError(e);
      }
    }
  }, [actions, data, rowsSelected, importActions]);

  const getFileName = React.useCallback(() => {
    const files = data.filter(({ id }) => rowsSelected.includes(id));
    const fileName = (files[0].fileName || files[0].name).split('.');
    return fileName;
  }, [data, rowsSelected]);

  const checkIsAvailablePrint = React.useCallback(() => {
    try {
      const fileName = getFileName();
      const extension = fileName[fileName.length - 1];
      return ALLOWED_FORMATS.includes(extension);
    } catch {
      return false;
    }
  }, [getFileName]);

  const handleDownload = React.useCallback(
    async (asics, p7s) => {
      if (busy) return;

      const files = data.filter(({ id }) => rowsSelected.includes(id));

      setBusy(true);

      setAnchorEl(null);

      try {
        const fileList = [];

        for (let i = 0; i < files.length; i++) {
          setDownloadState(i);
          fileList[i] = await actions.handleDownloadFile(files[i], asics, p7s);
          await awaitDelay(QUEUE_DELAY);
        }

        setDownloadState(false);

        if (printAction && isRow) {
          const fileName = getFileName();
          const extention = fileName[fileName.length - 1];
          printData({ fileList, extention });
          setBusy(false);
          return;
        }

        if (files.length === 1) {
          setBusy(false);
          const blob = await fetch(fileList[0]).then((res) => res.blob());
          let fileName = (files[0].fileName || files[0].name).split('.');
          if (p7s) {
            fileName.push('p7s');
          } else if (asics) {
            fileName.push('zip');
          }
          downloadBase64Attach({ fileName: fileName.join('.') }, blob);
          return;
        }

        const zip = new JSZip();

        files.forEach((file, index) => {
          let fileName = `${index + 1}-${file.fileName || file.name}`;
          if (asics) {
            fileName = fileName + '.zip';
          }
          if (p7s) {
            fileName = fileName + '.p7s';
          }
          zip.file(fileName, fileList[index].split(',').pop(), {
            base64: true
          });
        });

        const zipFile = await zip.generateAsync({ type: 'blob' });

        setBusy(false);

        downloadBase64Attach({ fileName: t('ArchiveName') }, zipFile);

        if (asics) {
          importActions.clearDocumentAttaches();
        }

        return;
      } catch (e) {
        setBusy(false);
      }
    },
    [actions, busy, data, importActions, isRow, rowsSelected, t, getFileName, printAction]
  );

  const renderProgressState = React.useCallback(
    () => (
      <>
        {downloadState ? (
          <Typography>
            {t('DownloadState', {
              state: `${downloadState}/${(data || []).length}`
            })}
          </Typography>
        ) : null}
      </>
    ),
    [data, downloadState, t]
  );

  const renderMenu = React.useCallback(() => {
    return (
      <>
        <Menu
          anchorEl={anchorEl}
          keepMounted={true}
          classes={{
            paper: classes.paper
          }}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem onClick={() => handleDownload(false)}>{t('Originals')}</MenuItem>

          {hasP7sSignature ? (
            <MenuItem onClick={() => handleDownload(false, true)}>{t('P7SSigns')}</MenuItem>
          ) : null}
        </Menu>
        {renderProgressState()}
      </>
    );
  }, [anchorEl, classes.paper, handleDownload, hasP7sSignature, renderProgressState, t]);

  const handleClickDownload = React.useCallback(
    ({ currentTarget }) => {
      if (useAsics && data.every(({ signature }) => !!signature)) {
        setAnchorEl(currentTarget);
        return;
      } else if (isArrayOfFiles) {
        downloadMultipleFiles(data.map(({ link, url }) => link || url));
      }
      handleDownload(false);
    },
    [data, handleDownload, useAsics, isArrayOfFiles]
  );

  const downloadMultipleFiles = (fileUrls) => {
    fileUrls.forEach((url, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', '');
        link.style.display = 'none';
        link.click();
      }, index * 1000);
    });
  };

  const handleClickP7SDownload = React.useCallback(
    ({ currentTarget }) => {
      if (useAsics && data.every(({ signature }) => !!signature)) {
        setAnchorEl(currentTarget);
        return;
      }
      getFileP7S();
    },
    [data, getFileP7S, useAsics]
  );

  if (printAction && isRow) {
    const isAvailablePrint = checkIsAvailablePrint();

    if (!isAvailablePrint) return null;

    return (
      <>
        <Tooltip title={t('Print')}>
          <IconButton onClick={() => handleDownload(false)} aria-label={t('Print')}>
            {busy ? <CircularProgress size={24} /> : <PrintIcon />}
          </IconButton>
        </Tooltip>
        {renderProgressState()}
      </>
    );
  }

  if (hidden) return null;

  if (GridActionsCellItem) {
    return (
      <>
        <Tooltip title={t('Download')}>
          <GridActionsCellItem
            icon={busy ? <CircularProgress size={24} /> : <DownloadIcon />}
            label={t('Download')}
            arial-label={t('Download')}
            onClick={handleClickDownload}
          />
        </Tooltip>
        {renderMenu()}
      </>
    );
  }

  return (
    <>
      {p7sDownload && hasP7sSignature ? (
        <>
          {!!actions.handleDownloadP7SFile ? (
            <Tooltip title={t('DownloadFileP7S')}>
              <IconButton onClick={handleClickP7SDownload} size="large">
                <KeyIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              color="inherit"
              variant="text"
              aria-label={t('Download') + ' P7S'}
              onClick={handleClickP7SDownload}
            >
              {busy ? <CircularProgress size={24} /> : 'P7S'}
            </Button>
          )}
        </>
      ) : null}

      {!p7sDownload && (
        <>
          {alternativeIcons ? (
            <Button
              onClick={handleClickDownload}
              startIcon={busy ? <CircularProgress size={24} /> : <DownloadIcon />}
              aria-label={t('Download')}
            >
              {t('Download')}
            </Button>
          ) : (
            <Tooltip title={t('Download')}>
              <IconButton onClick={handleClickDownload} aria-label={t('Download')}>
                {busy ? <CircularProgress size={24} /> : <SaveAltIcon />}
              </IconButton>
            </Tooltip>
          )}
        </>
      )}
      {renderMenu()}
    </>
  );
};

const translated = translate('FileDataTable')(DownloadAllButton);

const mapDispatchToProps = (dispatch) => ({
  importActions: {
    clearDocumentAttaches: bindActionCreators(clearDocumentAttaches, dispatch),
    requestWorkflowProcessAttachP7S: bindActionCreators(requestWorkflowProcessAttachP7S, dispatch)
  }
});

const connected = connect(null, mapDispatchToProps)(translated);

export default connected;
