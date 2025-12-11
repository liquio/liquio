import SaveAltIcon from '@mui/icons-material/SaveAlt';
import { Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { DrawerContent } from 'layouts/LeftSidebar';
import MobileDetect from 'mobile-detect';
import printJS from 'print-js';
import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';

import { setOpenDrawer } from 'actions/app';
import { ReactComponent as PrintIcon } from 'assets/img/icon_print.svg';
import base64ToBlob from 'helpers/base64ToBlob';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import StoreEventError from 'modules/tasks/pages/Task/components/StoreEventError';
import TaskDetails from 'modules/tasks/pages/Task/components/TaskDetails';
import styles from 'modules/tasks/pages/Task/screens/PreviewScreen/components/PreviewScreenLayoutStyle';
import SigningAction from 'modules/tasks/pages/Task/screens/PreviewScreen/components/SigningAction';
import TaskPreview from 'modules/tasks/pages/Task/screens/PreviewScreen/components/TaskPreview';

const PreviewScreenLayout = ({
  classes,
  task,
  template,
  storeEventError,
  busy,
  setBusy,
  handleFinish,
  backToEdit,
  pdfRequired,
  isUserUnitHead,
  showSignerList,
  screens,
  setTaskScreen,
  t,
  pdfDocuments,
  documents,
  fileList,
  actions
}) => {
  const printPdfButton = React.useMemo(() => pdfRequired !== false, [pdfRequired]);
  const md = new MobileDetect(window.navigator.userAgent);
  const isMobile = !!md.mobile();

  const setLoadingState = (loading) => {
    if (!loading) {
      actions.setOpenDrawer(true);
    }
  };

  const handleDownloadPdf = React.useCallback(() => {
    const pdfDocument = pdfDocuments[task.documentId];
    const { attachments, fileName } = documents[task.documentId] || {};

    downloadBase64Attach({ fileName: fileName || 'document' }, pdfDocument);

    (attachments || [])
      .filter(({ isGenerated }) => isGenerated)
      .forEach((attachment) => {
        downloadBase64Attach({ fileName: attachment.name || 'document' }, fileList[attachment.id]);
      });
  }, [documents, fileList, pdfDocuments, task.documentId]);

  const handlePrint = React.useCallback(() => {
    const pdfDocument = pdfDocuments[task.documentId];
    const pdfBlob = base64ToBlob(pdfDocument.split(',').pop());
    const url = URL.createObjectURL(pdfBlob);
    printJS(url);
  }, [pdfDocuments, task.documentId]);

  const customToolbar = (
    <>
      {!isMobile && (
        <Button
          onClick={handlePrint}
          startIcon={<PrintIcon />}
          className={classes.download}
          aria-label={t('PrintBtn')}
        >
          {t('PrintBtn')}
        </Button>
      )}
      <Button
        onClick={handleDownloadPdf}
        startIcon={<SaveAltIcon />}
        className={classes.download}
        aria-label={t('SaveBtn')}
      >
        {t('SaveBtn')}
      </Button>
    </>
  );

  return (
    <div className={classes.taskPreviewContainer}>
      <StoreEventError error={storeEventError} />
      <DrawerContent
        disableScrolls={true}
        drawer={
          isUserUnitHead || showSignerList ? (
            <TaskDetails
              task={task}
              template={template}
              isUserUnitHead={isUserUnitHead}
              showSignerList={showSignerList}
            />
          ) : null
        }
      >
        <div className={classes.screenContainer}>
          <div className={classes.pdfPreview}>
            <TaskPreview
              setLoadingState={setLoadingState}
              task={task}
              template={template}
              screens={screens}
              setTaskScreen={setTaskScreen}
              customToolbar={printPdfButton ? customToolbar : null}
            />
          </div>
          <SigningAction
            busy={busy}
            setBusy={setBusy}
            task={task}
            template={template}
            handleFinish={handleFinish}
            backToEdit={backToEdit}
          />
        </div>
      </DrawerContent>
    </div>
  );
};

PreviewScreenLayout.propTypes = {
  classes: PropTypes.object.isRequired,
  task: PropTypes.object.isRequired,
  template: PropTypes.object.isRequired,
  backToEdit: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
  setBusy: PropTypes.func.isRequired,
  handleFinish: PropTypes.func.isRequired,
  storeEventError: PropTypes.object,
  pdfRequired: PropTypes.bool.isRequired,
  isUserUnitHead: PropTypes.bool.isRequired,
  showSignerList: PropTypes.bool.isRequired
};

PreviewScreenLayout.defaultProps = {
  storeEventError: {}
};

const mapStateToProps = ({
  auth: { info },
  files: { pdfDocuments, list },
  task: { documents }
}) => ({ authInfo: info, pdfDocuments, documents, fileList: list });

const mapDispatchToProps = (dispatch) => ({
  actions: {
    setOpenDrawer: bindActionCreators(setOpenDrawer, dispatch)
  }
});

const translated = translate('TaskPage')(withStyles(styles)(PreviewScreenLayout));

export default connect(mapStateToProps, mapDispatchToProps)(translated);
