import React from 'react';
import { connect, useSelector } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';
import classNames from 'classnames';
import printJS from 'print-js';
import { Toolbar, Typography, Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import WarningIcon from '@mui/icons-material/Warning';
import { Theme } from '@mui/material/styles';

import PreloaderRaw from 'components/Preloader';
import FileDataTableRaw from 'components/FileDataTable';
import FilePreviewRaw from 'components/FilePreview';
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

const Preloader = PreloaderRaw as unknown as React.ComponentType<Record<string, unknown>>;
const FileDataTable = FileDataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const FilePreview = FilePreviewRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: Theme & { borderColor?: string; inboxFilesToolbar?: Record<string, unknown>; navLinkActive?: string }) => ({
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
    position: 'fixed' as const,
    borderTop: `1px solid ${theme?.borderColor || theme?.palette?.divider}`,
    backgroundColor: theme?.palette?.background?.paper,
    padding: '24px 40px',
    width: '100%',
    ...(theme?.inboxFilesToolbar || {})
  },
  appBarShift: {
    position: 'static' as const,
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
    backgroundColor: theme?.palette?.background?.paper,
    height: 40,
    '&:hover': {
      backgroundColor: theme?.navLinkActive || theme?.palette?.action?.hover
    }
  }
});

interface DocumentRecord {
  attachments?: unknown[];
  fileName?: string;
  asic?: { asicmanifestFileId?: string };
  [key: string]: unknown;
}

interface InboxFileDetailsProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  actions: {
    loadTaskDocument: (documentId: string | number) => Promise<unknown>;
    getPDFDocumentDecoded: (params: { documentId: string | number }) => Promise<unknown>;
    downloadDocumentAttach: (params: { documentId: string | number; id: string | number; hasP7sSignature?: boolean }, asics?: boolean) => Promise<unknown>;
    downloadDocumentAsicContainer: (documentId: string | number) => Promise<unknown>;
  };
  fileStorage?: Record<string, unknown>;
  documentId: string;
  name?: string;
  documents: Record<string, DocumentRecord>;
  pdfDocuments: Record<string, unknown>;
}

const InboxFileDetails = (props: InboxFileDetailsProps) => {
  const { t, classes, actions, fileStorage = {}, documentId } = React.useMemo(() => props, [props]);

  const [busy, setBusy] = React.useState(false);
  const debugMode = useSelector((state: { auth: { debugMode?: boolean } }) => state.auth.debugMode);
  const openSidebar = useSelector((state: { app: { openSidebar?: boolean } }) => state.app.openSidebar);

  const getData = React.useCallback(
    ({ documentId, documents, pdfDocuments }: { documentId: string; documents: Record<string, DocumentRecord>; pdfDocuments: Record<string, unknown> }) => ({
      document: documents[documentId],
      pdfDocument: pdfDocuments[documentId]
    }),
    []
  );

  const { document, pdfDocument } = React.useMemo(() => getData(props), [props, getData]);

  const init = React.useCallback(
    ({ actions, documentId }: InboxFileDetailsProps) => {
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

    downloadBase64Attach({ fileName: name + '.asice' }, container as string);
  };

  const handlePrint = React.useCallback(() => {
    const pdfBlob = base64ToBlob((pdfDocument as string).split(',').pop() as string);
    const url = URL.createObjectURL(pdfBlob);
    printJS(url);
  }, [pdfDocument]);

  const { attachments, fileName, asic } = React.useMemo(() => document || ({} as DocumentRecord), [document]);

  const handleSave = React.useCallback(
    () => downloadBase64Attach({ fileName }, pdfDocument as string),
    [pdfDocument, fileName]
  );

  const backToInbox = React.useCallback(() => history.push('/workflow/inbox'), []);

  React.useEffect(() => {
    if (documentId) init(props);
  }, [documentId, init, props]);

  if (pdfDocument instanceof Error) {
    return (
      <Content>
        <WarningIcon color="error" />
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
                    className={[classes.printButton, classes.buttonWhite] as unknown as string}
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

            {(asic as { asicmanifestFileId?: string }).asicmanifestFileId ? (
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

interface InboxFileDetailsState {
  task: { documents: Record<string, DocumentRecord> };
  files: { list: Record<string, unknown>; pdfDocuments: Record<string, unknown> };
}

const mapStateToProps = ({ task: { documents }, files: { list, pdfDocuments } }: InboxFileDetailsState) => ({
  documents,
  fileStorage: list,
  pdfDocuments
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    getPDFDocumentDecoded: bindActionCreators(getPDFDocumentDecoded, dispatch),
    loadTaskDocument: bindActionCreators(loadTaskDocument, dispatch),
    downloadDocumentAttach: bindActionCreators(downloadDocumentAttach, dispatch),
    downloadDocumentAsicContainer: bindActionCreators(downloadDocumentAsicContainer, dispatch)
  }
});

const styled = withStyles(styles)(InboxFileDetails as never);
const translated = translate('InboxFilesPage')(styled as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
