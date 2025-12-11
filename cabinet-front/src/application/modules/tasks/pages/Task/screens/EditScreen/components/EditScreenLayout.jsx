import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import evaluate from 'helpers/evaluate';
import {
  FormControl,
  FormHelperText,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { translate } from 'react-translate';
import CloseIcon from '@mui/icons-material/Close';

import { useAuth } from 'hooks/useAuth';
import { DrawerContent, Content } from 'layouts/LeftSidebar';
import { EJVError, SchemaForm, SchemaStepper } from 'components/JsonSchema';
import Actions from 'modules/tasks/pages/Task/screens/EditScreen/components/Actions';
import ImportActions from 'modules/tasks/pages/Task/screens/EditScreen/components/ImportActions';
import TaskDetails from 'modules/tasks/pages/Task/components/TaskDetails';
import StoreEventError from 'modules/tasks/pages/Task/components/StoreEventError';
import ExtReaderMessages from 'modules/tasks/pages/Task/screens/EditScreen/components/ExtReaderMessages';
import checkAccess from 'helpers/checkAccess';
import HandleTask from 'modules/tasks/pages/Task/screens/EditScreen/components/HandleTask';
import Timer from 'modules/tasks/pages/Task/components/Timer';
import styles from 'modules/tasks/pages/Task/screens/EditScreen/components/editScreenStyles';
import ProgressLine from 'components/Preloader/ProgressLine';
import storage from 'helpers/storage';

const EditScreenLayout = ({
  busy,
  pendingRegisters,
  processing,
  readOnly,
  task,
  tasks,
  origin,
  origins,
  classes,
  actions,
  storeEventError,
  validationErrors,
  validationPageErrors,
  setStoreEventError,
  steps,
  stepName,
  userUnits,
  activeStep,
  template,
  templates,
  handleSetStep,
  computedMatch,
  fileStorage,
  handleImport,
  handleChange,
  handleStore,
  handleNextStep,
  handlePrevStep,
  handleFinish,
  isUserUnitHead,
  task: { isEntry },
  blockForward,
  extReaderMessages: { pendingMessage, externalReaderErrors, triggerExternalPath },
  onHandleTask,
  onCancelHandlingTask,
  totalErrors,
  isOnboarding,
  defaultValueExecuted,
  loadingModalVisible,
  handleLoadingModalVisible,
  loadingModalVisibleErrorText,
  processingStatus,
  t
}) => {
  React.useEffect(() => {
    const lang = storage?.getItem('lang')?.toUpperCase() || 'UA';
    if (jsonSchema?.multiLanguage && task.document?.data?.language !== lang) {
      actions.handleChange.bind(null, 'lang')(lang);
    }
  }, [actions, task.document]);

  const { info } = useAuth();

  const { jsonSchema } = template;
  const { description } = jsonSchema.properties[stepName];
  const result = evaluate(description, task.document.data);
  const subtitle = result instanceof Error ? description : result;

  const { hideStepperTitles } = jsonSchema;

  const handlingButton = React.useMemo(() => {
    const handleButton = template?.jsonSchema?.handleButton;
    const resultEvaluated = evaluate(handleButton, task.document.data);
    if (resultEvaluated instanceof Error) return false;
    return resultEvaluated;
  }, [template, task.document.data]);

  const workInProgress = handlingButton
    ? !task.meta.handling || !Object.keys(task.meta?.handling).length
    : false;

  const handlingExists =
    Object.keys(task?.meta?.handling || {}).length > 0 &&
    task?.meta?.handling?.userId === info.userId;

  const lockInterface = template?.jsonSchema?.handleButton
    ? !(handlingExists && handlingButton)
    : false;

  const lockCommitBtn = jsonSchema?.lockPDFBtnIfNoHandle ? lockInterface : false;

  const isBusy = busy || pendingRegisters;

  const canCommit = !(task.deleted || lockCommitBtn);

  return (
    <DrawerContent
      disableScrolls={true}
      collapseButton={true}
      drawer={
        checkAccess({ isUnitedUser: true }, null, userUnits) && !isEntry ? (
          <TaskDetails task={task} template={template} isUserUnitHead={isUserUnitHead} />
        ) : null
      }
    >
      <div className={classes.drawer}>
        <StoreEventError error={storeEventError} onClose={() => setStoreEventError(null)} />
        <div className={classes.content}>
          <Content>
            <ImportActions handleImport={handleImport} importSchema={jsonSchema.importSchema} />

            {!task?.finished && handlingButton ? (
              <HandleTask
                meta={task.meta}
                onHandleTask={onHandleTask}
                onCancelHandlingTask={onCancelHandlingTask}
                busy={busy}
              />
            ) : null}

            <SchemaStepper
              task={task}
              steps={steps}
              jsonSchema={jsonSchema}
              activeStep={activeStep}
              errors={validationPageErrors}
              handleStep={(step) => handleSetStep(step)}
              isOnboarding={isOnboarding}
            />

            {subtitle ? (
              <Typography
                variant="h2"
                className={classNames(classes.schemaTitle, {
                  [classes.oneStepTitle]: steps.length === 1,
                  [classes.hideStepperTitles]: hideStepperTitles
                })}
              >
                {subtitle}
              </Typography>
            ) : null}

            <Timer
              task={task}
              jsonSchema={jsonSchema}
              steps={steps}
              activeStep={activeStep}
              actions={actions}
              rootDocument={task.document}
            />

            <SchemaForm
              task={task}
              defaultValueExecuted={defaultValueExecuted}
              taskId={computedMatch.params.taskId}
              schema={jsonSchema.properties[stepName]}
              stepName={stepName}
              steps={steps}
              active={!isBusy}
              locked={readOnly || isBusy || processing}
              fileStorage={fileStorage}
              actions={actions}
              activeStep={activeStep}
              readOnly={task.finished || task.deleted || readOnly || workInProgress}
              errors={validationErrors}
              rootDocument={task.document}
              template={template}
              originDocument={origin.document}
              value={task.document.data[stepName]}
              onChange={handleChange.bind(null, stepName)}
              handleStore={handleStore.bind(this)}
              totalErrors={totalErrors}
              parentSchema={jsonSchema.properties[stepName]}
              externalReaderMessage={
                <>
                  {triggerExternalPath ? (
                    <ExtReaderMessages
                      classes={{ root: classes.root, paper: classes.paper }}
                      busy={isBusy}
                      inControl={true}
                      pendingMessage={pendingMessage}
                      externalReaderErrors={externalReaderErrors}
                    />
                  ) : null}
                </>
              }
            />

            {validationPageErrors.length ? (
              <div>
                <FormControl error={true} className={classes.root}>
                  {validationPageErrors.map((error, index) => (
                    <FormHelperText key={index}>
                      <EJVError error={error} />
                    </FormHelperText>
                  ))}
                </FormControl>
              </div>
            ) : null}

            {loadingModalVisible && (
              <Dialog
                open={true}
                onClose={() =>
                  processing || processingStatus ? null : handleLoadingModalVisible(false)
                }
              >
                <DialogTitle>{t('AsyncModalTitle')}</DialogTitle>
                {!processing && !processingStatus ? (
                  <IconButton
                    onClick={() => handleLoadingModalVisible(false)}
                    className={classes.closeIcon}
                  >
                    <CloseIcon className={classes.closeIconImg} />
                  </IconButton>
                ) : null}
                <DialogContent>
                  <Typography>
                    {loadingModalVisibleErrorText && !processing && !processingStatus
                      ? loadingModalVisibleErrorText
                      : t('AsyncModalText')}
                  </Typography>
                  {processing || processingStatus ? (
                    <div className={classes.progressLine}>
                      <ProgressLine loading={true} />
                    </div>
                  ) : null}
                </DialogContent>
              </Dialog>
            )}

            {!triggerExternalPath ? (
              <ExtReaderMessages
                classes={{ root: classes.root, paper: classes.paper }}
                busy={isBusy}
                inControl={false}
                pendingMessage={pendingMessage}
                externalReaderErrors={externalReaderErrors}
              />
            ) : null}
          </Content>
        </div>
        <Actions
          steps={steps}
          stepName={stepName}
          active={!readOnly && !isBusy && !processing}
          task={task}
          template={template}
          finished={task.finished}
          canCommit={canCommit}
          actions={{
            handleNextStep,
            handlePrevStep,
            handleFinish
          }}
          activeStep={activeStep}
          jsonSchema={jsonSchema}
          taskId={task.id}
          tasks={tasks}
          origins={origins}
          templates={templates}
          blockForward={blockForward}
          isOnboarding={isOnboarding}
        />
      </div>
    </DrawerContent>
  );
};

EditScreenLayout.propTypes = {
  busy: PropTypes.bool.isRequired,
  task: PropTypes.object.isRequired,
  classes: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  tasks: PropTypes.object.isRequired,
  origin: PropTypes.object.isRequired,
  origins: PropTypes.object.isRequired,
  templates: PropTypes.object.isRequired,
  storeEventError: PropTypes.func,
  validationErrors: PropTypes.array,
  validationPageErrors: PropTypes.object,
  setStoreEventError: PropTypes.func.isRequired,
  steps: PropTypes.array.isRequired,
  stepName: PropTypes.string.isRequired,
  activeStep: PropTypes.number.isRequired,
  template: PropTypes.object.isRequired,
  handleSetStep: PropTypes.func.isRequired,
  computedMatch: PropTypes.object.isRequired,
  fileStorage: PropTypes.object.isRequired,
  handleChange: PropTypes.func.isRequired,
  handleStore: PropTypes.func.isRequired,
  handleNextStep: PropTypes.func.isRequired,
  handlePrevStep: PropTypes.func.isRequired,
  handleFinish: PropTypes.func.isRequired,
  isUserUnitHead: PropTypes.bool.isRequired,
  externalReaderErrors: PropTypes.array,
  pendingMessage: PropTypes.array,
  blockForward: PropTypes.bool
};

EditScreenLayout.defaultProps = {
  validationErrors: null,
  validationPageErrors: null,
  externalReaderErrors: null,
  pendingMessage: null,
  blockForward: false,
  storeEventError: () => null
};

const styled = withStyles(styles)(EditScreenLayout);
const translated = translate('TaskPage')(styled);

export default translated;
