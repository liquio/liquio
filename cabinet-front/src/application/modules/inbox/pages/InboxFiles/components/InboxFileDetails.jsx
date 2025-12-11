import React from 'react';
import PropTypes from 'prop-types';
import { connect, useSelector } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import classNames from 'classnames';
import printJS from 'print-js';
import { Toolbar, Typography, Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import WarningIcon from '@mui/icons-material/Warning';

import Preloader from 'components/Preloader';
import FileDataTable from 'components/FileDataTable';
import FilePreview from 'components/FilePreview';
import { Content } from 'layouts/LeftSidebar';
import {
  loadTaskDocument,
  downloadDocumentAttach,
  getPDFDocumentDecoded,
  downloadDocumentAsicContainer
} from 'application/actions/task';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import base64ToBlob from 'helpers/base64ToBlob';
import { ReactComponent as DownloadIconBlack } from 'components/FileDataTable/assets/ic_download.svg';
import { ReactComponent as DownloadIcon } from 'assets/img/download_icon_white.svg';
import { ReactComponent as PrintIcon } from 'assets/img/icon_print.svg';
import { history } from 'store';

const styles = (theme) => ({
  printButton: {
    [theme.breakpoints.down('lg')]: {
      display: 'none'
    }
  },
  wrapper: {
    padding: '0 40px',
    marginBottom: 100
  },
  toolbar: {
    top: 'auto',
    bottom: 0,
    zIndex: 10,
    position: 'fixed',
    borderTop: '1px solid #E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: '24px 40px',
    width: '100%',
    ...(theme?.inboxFilesToolbar || {})
  },
  appBarShift: {
    position: 'static',
    maxWidth: '100%'
  },
  appBarShiftSidebar: {
    maxWidth: '100%'
  },
  button: {
    marginRight: 16,
    outlineOffset: 2
  },
  buttonWhite: {
    backgroundColor: '#FFFFFF',
    height: 40,
    '&:hover': {
      backgroundColor: '#0068ff1f'
    }
  }
});

const InboxFileDetails = (props) => {
  const { t, classes, actions, fileStorage, documentId } = React.useMemo(() => props, [props]);

  const [busy, setBusy] = React.useState(false);
  const debugMode = useSelector((state) => state.auth.debugMode);
  const openSidebar = useSelector((state) => state.app.openSidebar);

  const getData = React.useCallback(
    ({ documentId, documents, pdfDocuments }) => ({
      document: documents[documentId],
      pdfDocument: pdfDocuments[documentId]
    }),
    []
  );

  const { document, pdfDocument } = React.useMemo(() => getData(props), [props, getData]);

  const init = React.useCallback(
    ({ actions, documentId }) => {
      if (!document) {
        actions.loadTaskDocument(documentId);
      }

      if (!pdfDocument) {
        actions.getPDFDocumentDecoded({ documentId });
      }
    },
    [document, pdfDocument]
  );

  const handleDownloadContainer = async () => {
    const { actions, documentId, name } = props;

    setBusy(true);
    const container = await actions.downloadDocumentAsicContainer(documentId);
    setBusy(false);

    if (container instanceof Error) {
      return;
    }

    downloadBase64Attach({ fileName: name + '.asice' }, container);
  };

  const handlePrint = React.useCallback(() => {
    const pdfBlob = base64ToBlob(pdfDocument.split(',').pop());
    const url = URL.createObjectURL(pdfBlob);
    printJS(url);
  }, [pdfDocument]);

  const { attachments, fileName, asic } = React.useMemo(() => document || {}, [document]);

  const handleSave = React.useCallback(
    () => downloadBase64Attach({ fileName }, pdfDocument),
    [pdfDocument, fileName]
  );

  const backToInbox = React.useCallback(() => history.push('/workflow/inbox'), []);

  React.useEffect(() => {
    if (documentId) init(props);
  }, [documentId, init, props]);

  if (pdfDocument instanceof Error) {
    return (
      <Content>
        <WarningIcon style={{ color: '#d32f2f' }} />
        <Typography variant={'body2'}>{t('FileLoadingError')}</Typography>
      </Content>
    );
  }

  return (
    <>
      {!document || !pdfDocument ? (
        <Preloader />
      ) : (
        <>
          <div className={classes.wrapper}>
            <FilePreview
              file={pdfDocument}
              fileName={fileName}
              fileType={'pdf'}
              customToolbar={
                <>
                  <Button
                    onClick={handlePrint}
                    startIcon={<PrintIcon />}
                    className={[classes.printButton, classes.buttonWhite]}
                    aria-label={t('PrintBtn')}
                  >
                    {t('PrintBtn')}
                  </Button>
                  <Button
                    onClick={handleSave}
                    startIcon={<DownloadIconBlack />}
                    className={classes.buttonWhite}
                    aria-label={t('SaveBtn')}
                  >
                    {t('SaveBtn')}
                  </Button>
                </>
              }
            />

            {(attachments || []).length ? (
              <FileDataTable
                data={attachments}
                fileStorage={fileStorage}
                groupBy="labels"
                actions={{
                  handleDownloadFile: actions.downloadDocumentAttach
                }}
              />
            ) : null}
          </div>

          <Toolbar
            className={classNames({
              [classes.toolbar]: true,
              [classes.appBarShift]: debugMode,
              [classes.appBarShiftSidebar]: !openSidebar
            })}
          >
            <Button
              onClick={backToInbox}
              aria-label={t('BackToInbox')}
              className={classes.button}
              variant="outlined"
            >
              {t('BackToInbox')}
            </Button>

            {asic.asicmanifestFileId ? (
              <Button
                disabled={busy}
                startIcon={<DownloadIcon />}
                onClick={handleDownloadContainer}
                aria-label={t('DownloadAsic')}
                variant="contained"
              >
                {t('DownloadAsic')}
              </Button>
            ) : null}
          </Toolbar>
        </>
      )}
    </>
  );
};

InboxFileDetails.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  fileStorage: PropTypes.object,
  documentId: PropTypes.string.isRequired,
  name: PropTypes.string
};

InboxFileDetails.defaultProps = {
  fileStorage: {},
  name: ''
};

const mapStateToProps = ({ task: { documents }, files: { list, pdfDocuments } }) => ({
  documents,
  fileStorage: list,
  pdfDocuments
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    getPDFDocumentDecoded: bindActionCreators(getPDFDocumentDecoded, dispatch),
    loadTaskDocument: bindActionCreators(loadTaskDocument, dispatch),
    downloadDocumentAttach: bindActionCreators(downloadDocumentAttach, dispatch),
    downloadDocumentAsicContainer: bindActionCreators(downloadDocumentAsicContainer, dispatch)
  }
});

const styled = withStyles(styles)(InboxFileDetails);
const translated = translate('InboxFilesPage')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
