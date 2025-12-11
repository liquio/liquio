import React from 'react';
import { useTranslate } from 'react-translate';
import { useSelector } from 'react-redux';
import classNames from 'classnames';
import { Toolbar, Button, AppBar } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';

import ProgressLine from 'components/Preloader/ProgressLine';
import evaluate from 'helpers/evaluate';
import pdfRequired from 'modules/tasks/pages/Task/helpers/pdfRequired';
import signRequired from 'modules/tasks/pages/Task/helpers/signRequired';
import styles from 'modules/tasks/pages/Task/screens/EditScreen/components/actionsStyles.js';
import theme from 'theme';
import { useAuth } from 'hooks/useAuth';
import { getConfig } from '../../../../../../../../core/helpers/configLoader';

const useStyles = makeStyles(styles);

const { editScreenProgressStyle } = theme;

const Actions = (props) => {
  const config = getConfig();
  const t = useTranslate('TaskPage');
  const classes = useStyles();
  const { info } = useAuth();
  const debugMode = useSelector((state) => state.auth.debugMode);
  const openSidebar = useSelector((state) => state.app.openSidebar);

  const {
    active,
    finished,
    canCommit,
    activeStep,
    stepName,
    steps,
    task,
    template,
    template: {
      jsonSchema: { createPDFBtn, finishBtn, firstStepPrev, properties, hideBackNavigation } = {}
    } = {},
    actions: { handleNextStep, handlePrevStep, handleFinish },
    blockForward,
    isOnboarding
  } = props;

  const { allowShowPdfArchivedTask } = config;

  const getButtonText = React.useCallback(
    (textTemplate, defaultText) => {
      if (!textTemplate) {
        return defaultText;
      }

      try {
        const text = evaluate(textTemplate, task.document.data);
        if (text instanceof Error || typeof text !== 'string') {
          return textTemplate;
        }

        return text;
      } catch (e) {
        return defaultText;
      }
    },
    [task.document.data]
  );

  const checkActive = React.useCallback(() => {
    if (!template) {
      return false;
    }

    const { jsonSchema } = template;

    if (jsonSchema.checkActive && typeof jsonSchema.checkActive === 'string') {
      const result = evaluate(jsonSchema.checkActive, task.document.data);

      if (result instanceof Error) {
        result.commit({ type: 'checkActiveButton', jsonSchema });
        return false;
      }

      return result === true;
    }

    return true;
  }, [task.document.data, template]);

  const firstStepPrevAction = () => {
    let linkToRedirect = evaluate(firstStepPrev, task.document.data);

    if (linkToRedirect instanceof Error) {
      linkToRedirect = firstStepPrev;
    }

    window.location.href = linkToRedirect;
  };

  const isLastStep = React.useMemo(
    () => activeStep === steps.length - 1 && checkActive(),
    [activeStep, checkActive, steps.length]
  );

  const allowedNextOrFinish = React.useMemo(() => {
    let result = false;

    if ('checkStepFinal' in (properties[stepName] || {})) {
      const { checkStepFinal } = properties[stepName];
      if (typeof checkStepFinal === 'string') {
        result = evaluate(checkStepFinal, task.document.data, info);
      } else if (typeof checkStepFinal === 'boolean') {
        result = checkStepFinal;
      }
    }

    return result;
  }, [properties, stepName, task, info]);

  const createPDFBtnText = React.useMemo(
    () => getButtonText(createPDFBtn, t('CreatePDFBtn')),
    [createPDFBtn, getButtonText, t]
  );

  const finishBtnText = React.useMemo(
    () => getButtonText(finishBtn, t('FinishBtn')),
    [finishBtn, getButtonText, t]
  );

  const allowBackButton = React.useMemo(() => {
    if (!hideBackNavigation) {
      return true;
    }

    let hideBackButton = evaluate(hideBackNavigation, task.document.data);

    if (hideBackButton instanceof Error) {
      return true;
    }

    return !hideBackButton;
  }, [hideBackNavigation, task.document.data]);

  const isDisabled = !active && !finished;
  const finishConditional = !finished || (finished && allowShowPdfArchivedTask);

  const resultBtnText = React.useMemo(
    () =>
      signRequired(template, task) || pdfRequired(template, task)
        ? createPDFBtnText
        : finishBtnText,
    [createPDFBtnText, finishBtnText, task, template]
  );

  return (
    <AppBar
      position="relative"
      className={classNames({
        [classes.appBar]: true,
        [classes.appBarShift]: debugMode,
        [classes.appBarShiftSidebar]: !openSidebar,
        [classes.appBarOnboarding]: isOnboarding
      })}
      elevation={0}
      component="div"
    >
      {isDisabled ? <ProgressLine loading={true} style={editScreenProgressStyle} /> : null}
      <Toolbar className={classes.toolbar}>
        {activeStep === 0 && firstStepPrev && allowBackButton ? (
          <Button
            size="large"
            variant="outlined"
            disabled={isDisabled}
            className={classes.button}
            onClick={firstStepPrevAction}
            classes={{ disabled: classes.disabledBorder }}
            id="prev-step-button"
          >
            {t('PrevStepBtn')}
          </Button>
        ) : null}
        {activeStep !== 0 && allowBackButton ? (
          <Button
            size="large"
            variant="outlined"
            disabled={isDisabled}
            className={classes.button}
            onClick={handlePrevStep}
            classes={{ disabled: classes.disabledBorder }}
            id="prev-step-button"
          >
            {t('PrevStepBtn')}
          </Button>
        ) : null}
        {activeStep < steps.length - 1 && !isLastStep && !allowedNextOrFinish ? (
          <Button
            size="large"
            color="primary"
            variant="contained"
            disabled={isDisabled || blockForward}
            className={classes.button}
            onClick={handleNextStep}
            id="next-step-button"
          >
            {t('NextStepBtn')}
          </Button>
        ) : null}
        {isLastStep && finishConditional && !allowedNextOrFinish ? (
          <Button
            size="large"
            color="primary"
            variant="contained"
            disabled={!canCommit || !active}
            className={classes.createPDF}
            onClick={handleFinish}
            id="finish-button"
          >
            {resultBtnText}
          </Button>
        ) : null}
      </Toolbar>
    </AppBar>
  );
};

export default Actions;
