import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import { Typography, IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import WarningIcon from '@mui/icons-material/Warning';

import {
  getPDFDocumentDecoded,
  loadTaskDocument,
  downloadDocumentAttach
} from 'application/actions/task';
import processList from 'services/processList';
import evaluate from 'helpers/evaluate';
import FilePreview from 'components/FilePreview';
import Preloader from 'components/Preloader';
import ErrorScreen from 'components/ErrorScreen';
import DownloadIcon from 'assets/img/ic_download.svg';
import DocumentIcon from 'assets/img/ic_document.svg';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import FileDataTable from 'components/FileDataTable';

const styles = (theme) => ({
  errorWrapper: {
    padding: 30
  },
  collapsePdfWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    border: '2px solid #000',
    padding: 30,
    maxWidth: 720,
    marginBottom: 50,
    marginTop: 50
  },
  pdfTitleCollapse: {
    display: 'flex'
  },
  pdfTitle: {
    fontSize: 24,
    lineHeight: '28px',
    paddingLeft: 20
  },
  wrapperAttachments: {
    maxWidth: window.innerWidth < 1024 ? 'calc(100% - 36px)' : 'calc(100% - 80px)',
    marginLeft: 40,
    marginRight: 40,
    [theme.breakpoints.down('md')]: {
      marginLeft: 16,
      marginRight: 16
    }
  }
});

const TaskPreview = ({
  t,
  task,
  classes,
  actions,
  fileList,
  template,
  documents,
  pdfDocuments,
  setTaskScreen,
  customToolbar,
  setLoadingState = () => {}
}) => {
  const [busy, setBusy] = React.useState(true);
  const [error, setError] = React.useState();
  const [showOrderAttachments, setShowOrderAttachments] = React.useState(false);

  const renderAttachments = React.useMemo(() => {
    const { jsonSchema } = template;

    const { expandAttachments } = jsonSchema;

    if (!expandAttachments) return false;

    const show = evaluate(expandAttachments, task?.document?.data);

    if (show instanceof Error) {
      setError(show);
      return false;
    }

    return show;
  }, [task, template]);

  const getHideMainPdf = () => {
    const hideMainPDF = template?.jsonSchema?.hideMainPDF;

    if (hideMainPDF && typeof hideMainPDF === 'boolean') return hideMainPDF;

    if (hideMainPDF && typeof hideMainPDF === 'string') {
      const result = evaluate(hideMainPDF, task.document.data);
      return result instanceof Error ? hideMainPDF : result;
    }

    return null;
  };

  const init = React.useCallback(async () => {
    const { jsonSchema } = template;
    const { orderAttachments } = jsonSchema;

    if (!getHideMainPdf()) {
      const pdf = await processList.hasOrSet(
        'getPDFDocumentDecoded',
        actions.getPDFDocumentDecoded,
        task
      );
      if (pdf.isAccepted) {
        setTaskScreen && setTaskScreen('processing');
        return;
      }
    }

    const { attachments = [] } = await processList.hasOrSet(
      'loadTaskDocument',
      actions.loadTaskDocument,
      task.documentId
    );

    if (orderAttachments && renderAttachments) {
      const changedOrderAttachments = evaluate(
        orderAttachments,
        task?.document?.data,
        attachments.filter(({ isGenerated }) => isGenerated || renderAttachments)
      );
      if (changedOrderAttachments instanceof Error) {
        setError(changedOrderAttachments);
      }
      setShowOrderAttachments(changedOrderAttachments);
    }

    try {
      await Promise.all(
        attachments
          .filter(({ isGenerated }) => isGenerated || renderAttachments)
          .map((file) => {
            if (fileList[file.id]) {
              return Promise.resolve(fileList[file.id]);
            }

            return processList.hasOrSet(
              'downloadDocumentAttach',
              actions.downloadDocumentAttach,
              file
            );
          })
      );
    } catch (e) {
      setError(e);
    }

    setBusy(false);
    setLoadingState(false);
  }, [
    actions.downloadDocumentAttach,
    actions.getPDFDocumentDecoded,
    actions.loadTaskDocument,
    fileList,
    setTaskScreen,
    task,
    template,
    renderAttachments,
    setLoadingState
  ]);

  React.useEffect(() => {
    init();
  }, [task]);

  if (!task || busy) {
    return (
      <div>
        <Preloader flex={true} />
      </div>
    );
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  const pdfDocument = pdfDocuments[task.documentId];
  const { attachments = [] } = documents[task.documentId] || {};

  if (pdfDocument instanceof Error) {
    return (
      <div className={classes.errorWrapper}>
        <WarningIcon style={{ color: '#d32f2f' }} />
        <Typography variant={'body2'}>{t('FileLoadingError')}</Typography>
      </div>
    );
  }

  const handleDownloadPdf = (file, name) =>
    downloadBase64Attach(
      {
        fileName: name
      },
      file
    );

  const getFileName = (index) => template?.jsonSchema?.collapsePdfPreviewTitle[index];

  return (
    <>
      {template?.jsonSchema?.collapsePdfPreviewTitle ? (
        <div className={classes.collapsePdfWrapper}>
          <div className={classes.pdfTitleCollapse}>
            <img src={DocumentIcon} alt="document icon" />
            <Typography className={classes.pdfTitle}>{getFileName(0)}</Typography>
          </div>
          <IconButton onClick={() => handleDownloadPdf(pdfDocument, getFileName(0))}>
            <img src={DownloadIcon} alt="download icon" />
          </IconButton>
        </div>
      ) : (
        <FilePreview
          file={pdfDocument}
          fileType={'pdf'}
          fileName={template.name}
          customToolbar={customToolbar}
          hideMainPDF={getHideMainPdf()}
        />
      )}

      {(showOrderAttachments
        ? showOrderAttachments
        : attachments.filter(({ isGenerated }) => isGenerated || renderAttachments)
      ).map((file, index) => {
        if (template?.jsonSchema?.collapsePdfPreviewTitle) {
          return (
            <div key={file.id} className={classes.collapsePdfWrapper}>
              <div className={classes.pdfTitleCollapse}>
                <img src={DocumentIcon} alt="document icon" />
                <Typography className={classes.pdfTitle}>{getFileName(index + 1)}</Typography>
              </div>
              <IconButton
                onClick={() => handleDownloadPdf(fileList[file.id], getFileName(index + 1))}
              >
                <img src={DownloadIcon} alt="download icon" />
              </IconButton>
            </div>
          );
        }
        if (!template?.jsonSchema?.isAttachmentsCollapsed) {
          return (
            <FilePreview
              key={file.id}
              file={fileList[file.id]}
              fileType={'pdf'}
              fileName={file.name}
            />
          );
        }
        return null;
      })}
      {renderAttachments && template?.jsonSchema?.isAttachmentsCollapsed ? (
        <div className={classes.wrapperAttachments} style={{ marginTop: 40, marginBottom: 16 }}>
          <Typography variant="h2" style={{ marginBottom: 16 }}>
            {t('AttachmentsPdf')}
          </Typography>
          <FileDataTable
            data={
              showOrderAttachments
                ? showOrderAttachments.map((file) => ({ ...file, flex: 1 }))
                : attachments.map((file) => ({ ...file, flex: 1 }))
            }
            fileStorage={fileList}
            groupBy="labels"
            actions={{
              handleDownloadFile: actions.downloadDocumentAttach
            }}
            isMobile={window.innerWidth < 600}
            previewAttach={true}
            hiddenMenu={true}
          />
        </div>
      ) : null}
    </>
  );
};

TaskPreview.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  task: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  fileList: PropTypes.object.isRequired,
  template: PropTypes.object.isRequired,
  documents: PropTypes.object.isRequired,
  pdfDocuments: PropTypes.object.isRequired,
  setTaskScreen: PropTypes.func.isRequired,
  customToolbar: PropTypes.node
};

TaskPreview.defaultProps = {
  customToolbar: null
};

const mapStateToProps = ({ task: { documents }, files: { pdfDocuments, list } }) => ({
  fileList: list,
  documents,
  pdfDocuments
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    getPDFDocumentDecoded: bindActionCreators(getPDFDocumentDecoded, dispatch),
    loadTaskDocument: bindActionCreators(loadTaskDocument, dispatch),
    downloadDocumentAttach: bindActionCreators(downloadDocumentAttach, dispatch)
  }
});

const styled = withStyles(styles)(TaskPreview);

const translated = translate('TaskPage')(styled);

export default connect(mapStateToProps, mapDispatchToProps)(translated);
