import React from 'react';
import { translate } from 'react-translate';
import { useSelector } from 'react-redux';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { Toolbar, Button, Dialog, DialogTitle, DialogActions, DialogContent } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import SigningDialog from 'components/P7SForm/SigningDialog';
import RejectSigningDialog from 'modules/tasks/pages/Task/screens/PreviewScreen/components/RejectSigningDialog';
import signRequired from 'modules/tasks/pages/Task/helpers/signRequired';
import styles from 'modules/tasks/pages/Task/screens/PreviewScreen/components/SingingActionLayoutStyle';
import evaluate from 'helpers/evaluate';
import dbStorage from 'helpers/indexedDB';

const SigningActionLayout = ({
  t,
  classes,
  busy,
  handleFinish,
  backToEdit,
  task: { isMePerformer, isMeSigner, signerUsers, minSignaturesLimitInfo },
  task,
  template,
  template: {
    jsonSchema: { forceSignerActions, rejectSignButton }
  },
  alreadySigned,
  alreadyRejected,
  steps,
  showSigningDialog,
  showRejectSigningDialog,
  showSuccessDialog,
  toggleSigningDialog,
  toggleRejectSigningDialog,
  toggleSuccessDialog,
  onSelectKey,
  onRejectSigning,
  finished,
  signProgress,
  signProgressText,
  getDataToSign,
  onSignHash,
  finishBtnText
}) => {
  const debugMode = useSelector((state) => state.auth.debugMode);
  const openSidebar = useSelector((state) => state.app.openSidebar);
  const userInfo = useSelector((state) => state.auth.info);

  const showSignerActions = evaluate(
    forceSignerActions || '() => false',
    task?.document?.data,
    task?.meta,
    userInfo
  );
  const shouldShowBackButton =
    isMePerformer &&
    !alreadySigned &&
    !alreadyRejected &&
    (showSignerActions
      ? (task?.document?.signatures || []).length &&
        (task?.document?.signatureRejections || []).length
      : true) &&
    steps.length > 0;

  const handleCloseSuccessDialog = () => {
    const topPagePart = document.querySelector('h1') || document.querySelector('header');
    topPagePart && topPagePart.scrollIntoView();
    toggleSuccessDialog(false);
  };

  React.useEffect(() => {
    const asyncWrapper = async () => {
      const storedSession = await dbStorage.getItem('sessionId');

      if (storedSession) {
        toggleSigningDialog(true);
      }
    };

    asyncWrapper();
  }, [toggleSigningDialog]);

  if (finished) {
    return (
      <Toolbar className={classes.toolbar}>
        {isMePerformer && steps.length > 0 ? (
          <Button
            size="large"
            variant="outlined"
            onClick={backToEdit}
            className={classes.backButton}
          >
            {t('PrevStepBtn')}
          </Button>
        ) : null}
      </Toolbar>
    );
  }

  return (
    <Toolbar
      className={classNames({
        [classes.toolbar]: true,
        [classes.appBarShift]: debugMode,
        [classes.appBarShiftSidebar]: !openSidebar
      })}
    >
      {shouldShowBackButton ? (
        <Button
          variant="outlined"
          onClick={backToEdit}
          className={classes.backButton}
          aria-label={t('PrevStepBtn')}
        >
          {t('PrevStepBtn')}
        </Button>
      ) : null}

      {signRequired(template, task) && (isMeSigner || !signerUsers.length) ? (
        <>
          <Button
            disabled={alreadySigned || alreadyRejected || busy}
            variant="contained"
            color="primary"
            onClick={() => toggleSigningDialog(true)}
            className={classes.backButton}
            aria-label={t('SignBtn')}
          >
            {finishBtnText ? finishBtnText : t('SignBtn')}
          </Button>
          {(signerUsers.length && !isMePerformer) || showSignerActions ? (
            <Button
              disabled={alreadySigned || alreadyRejected || busy}
              variant="outlined"
              onClick={() => toggleRejectSigningDialog(true)}
              aria-label={rejectSignButton ? rejectSignButton : t('RejectSignBtn')}
              className={classes.backButton}
            >
              {rejectSignButton ? rejectSignButton : t('RejectSignBtn')}
            </Button>
          ) : null}
          {signerUsers.length &&
          isMePerformer &&
          !!(minSignaturesLimitInfo && minSignaturesLimitInfo.isMinSignaturesLimitRaised) ? (
            <Button
              disabled={busy}
              variant="contained"
              onClick={() => handleFinish(true)}
              color="primary"
              aria-label={t('CommitDocument')}
            >
              {t('CommitDocument')}
            </Button>
          ) : null}
        </>
      ) : (
        <Button
          disabled={busy}
          variant="contained"
          onClick={() => handleFinish(true)}
          color="primary"
          aria-label={t('FinishBtn')}
        >
          {finishBtnText ? finishBtnText : t('FinishBtn')}
        </Button>
      )}
      <SigningDialog
        open={showSigningDialog}
        onSelectKey={onSelectKey}
        onClose={() => toggleSigningDialog(false)}
        signProgress={signProgress}
        signProgressText={signProgressText}
        getDataToSign={getDataToSign}
        onSignHash={onSignHash}
        task={task}
        template={template}
      />
      <Dialog open={showSuccessDialog} onClose={handleCloseSuccessDialog}>
        <DialogTitle className={classes.title}>{t('SuccesDialogTitle')}</DialogTitle>
        <DialogContent classes={{ root: classes.root }}>{t('SuccesDialogText')}</DialogContent>
        <DialogActions>
          <Button aria-label={t('closeText')} onClick={handleCloseSuccessDialog}>
            {t('closeText')}
          </Button>
        </DialogActions>
      </Dialog>
      <RejectSigningDialog
        open={showRejectSigningDialog}
        handleDone={onRejectSigning}
        onClose={() => toggleRejectSigningDialog(false)}
      />
    </Toolbar>
  );
};

SigningActionLayout.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  handleFinish: PropTypes.func.isRequired,
  backToEdit: PropTypes.func.isRequired,
  alreadySigned: PropTypes.bool.isRequired,
  alreadyRejected: PropTypes.bool.isRequired,
  showSigningDialog: PropTypes.bool.isRequired,
  showRejectSigningDialog: PropTypes.bool.isRequired,
  toggleSigningDialog: PropTypes.func.isRequired,
  toggleRejectSigningDialog: PropTypes.func.isRequired,
  onSelectKey: PropTypes.func.isRequired,
  onRejectSigning: PropTypes.func.isRequired,
  task: PropTypes.object.isRequired,
  template: PropTypes.object.isRequired,
  handleDownloadPdf: PropTypes.func.isRequired,
  steps: PropTypes.array,
  finished: PropTypes.bool,
  signProgress: PropTypes.number,
  signProgressText: PropTypes.string
};

SigningActionLayout.defaultProps = {
  steps: [],
  finished: false,
  signProgress: 0,
  signProgressText: null
};

const styled = withStyles(styles)(SigningActionLayout);
const translated = translate('TaskPage')(styled);
export default translated;
