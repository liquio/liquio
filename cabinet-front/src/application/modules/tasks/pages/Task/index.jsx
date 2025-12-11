import React, { Suspense } from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import MobileDetect from 'mobile-detect';
import { history } from 'store';
import qs from 'qs';
import cleenDeep from 'clean-deep';
import moment from 'moment';
import paths from 'deepdash/paths';
import objectPath from 'object-path';

import {
  loadTask,
  createTask,
  commitTask,
  deleteTaskDocument,
  setTaskStep,
  markTaskRead,
  setTaskScreen,
  clearStepAndScreen,
  generatePDFDocument,
  getPDFDocumentDecoded,
  prepareDocument,
  validateDocument,
  downloadDocumentAttach,
  setStartPDFGenerationTime,
  clearExternalReaderCache,
  storeTaskDocument,
  handleSilentTriggers,
  deleteDraft,
  getExternalReaderCaptchaList
} from 'application/actions/task';
import { requestExternalData } from 'application/actions/externalReader';
import { updateUserInfo, requestUserInfo } from 'actions/auth';
import { loadDocumentTemplate, loadTaskTemplates } from 'application/actions/documentTemplate';
import { setOpenSidebar } from 'actions/app';
import getDeltaProperties from 'helpers/getDeltaProperties';
import processList from 'services/processList';
import waiter from 'helpers/waitForAction';
import evaluate from 'helpers/evaluate';
import sleep from 'helpers/sleep';
import Preloader from 'components/Preloader';
import ConfirmDialog from 'components/ConfirmDialog';
import Disclaimer from 'components/Disclaimer';
import ModulePage from 'components/ModulePage';
import propsToData from 'modules/tasks/pages/Task/helpers/propsToData';
import pdfRequired from 'modules/tasks/pages/Task/helpers/pdfRequired';
import signRequired from 'modules/tasks/pages/Task/helpers/signRequired';
import getTemplateSteps from 'modules/tasks/pages/Task/helpers/getTemplateSteps';
import isCyrillic from 'helpers/isCyrillic';
import validateProfile from 'modules/tasks/pages/Task/helpers/validateProfile';
import queueFactory from 'helpers/queueFactory';
import storage from 'helpers/storage';
import dbStorage from 'helpers/indexedDB';
import handleTranslateText from 'helpers/handleTranslateText';

const md = new MobileDetect(window.navigator.userAgent);
const isMobile = !!md.mobile();

const SuccessMessage = React.lazy(() =>
  import('modules/tasks/pages/Task/components/SuccessMessage')
);
const TaskPageLayout = React.lazy(() =>
  import('modules/tasks/pages/Task/components/TaskPageLayout')
);
const PreviewScreen = React.lazy(() => import('modules/tasks/pages/Task/screens/PreviewScreen'));
const EditScreen = React.lazy(() => import('modules/tasks/pages/Task/screens/EditScreen'));
const ProcessingScreen = React.lazy(() =>
  import('modules/tasks/pages/Task/screens/ProcessingScreen')
);
const ErrorScreen = React.lazy(() => import('components/ErrorScreen'));

const screens = {
  EDIT: 'edit',
  PREVIEW: 'preview',
  SUCCESS: 'success',
  ERROR: 'error',
  PROCESSING: 'processing'
};

const EXPIRED_DRAFT_TIME = 2;
const INTERVAL_TIME = 1000;

class TaskPage extends ModulePage {
  constructor(props) {
    super(props);

    this.state = {
      busy: false,
      error: null,
      initing: false,
      locked: false,
      validateErrors: [],
      expiringTimer: ''
    };

    this.settingDefaultStep = false;
  }

  evalStepDescription = (step) => {
    const { origins, taskId } = this.props;
    const documentData = origins && taskId && origins[taskId] ? origins[taskId].document.data : {};
    const result = evaluate(step.description, documentData);
    if (result instanceof Error) return step.description;
    return result;
  };

  componentGetTitle() {
    const { error } = this.state;
    const { t, taskScreens } = this.props;
    const { template, stepId, taskId } = propsToData(this.props);

    if (error) {
      return isCyrillic(error.message) ? error.message : t(error.message);
    }

    if (!template || !template.jsonSchema.properties) {
      return '';
    }

    const step = template.jsonSchema.properties[stepId] || {};

    return [
      this.getTitle(),
      this.evalStepDescription(step),
      taskScreens[taskId] === screens.PREVIEW && t('Preview')
    ]
      .filter(Boolean)
      .join(': ');
  }

  componentDidMount() {
    super.componentDidMount();
    this.init(this.props);

    const { actions } = this.props;

    actions.setOpenSidebar(false);
  }

  componentWillUnmount() {
    const { actions, debugMode } = this.props;
    const { taskId } = propsToData(this.props);

    if (this.getCurrentScreen() === screens.SUCCESS) {
      actions.clearStepAndScreen(taskId);
    }

    if (!debugMode) {
      this.deleteTaskDocument();
    }

    clearInterval(this.expiringTimer);
  }

  componentWillReceiveProps(nextProps) {
    const { taskScreens } = nextProps;

    const {
      taskId: oldTaskId,
      stepId: oldStepId,
      workflowTemplateId: oldWorkflowTemplateId,
      taskTemplateId: oldTaskTemplateId
    } = this.props;

    const {
      taskId: newTaskId,
      stepId: newStepId,
      workflowTemplateId: newWorkflowTemplateId,
      taskTemplateId: newTaskTemplateId
    } = nextProps;

    if (
      newTaskId !== oldTaskId ||
      oldWorkflowTemplateId !== newWorkflowTemplateId ||
      oldTaskTemplateId !== newTaskTemplateId
    ) {
      this.init(nextProps);
      return;
    }

    if (oldStepId !== newStepId) {
      const { task, taskId, stepId, steps } = propsToData(nextProps);
      const {
        document: { fileId }
      } = task;

      if (!taskScreens[taskId]) {
        if (fileId && !stepId) {
          this.setTaskScreen(screens.PREVIEW);
        } else if (steps.length) {
          this.setTaskScreen(screens.EDIT);
        }
      }
    }

    this.checkAssignParam();
  }

  checkAssignParam = () => {
    const { t } = this.props;
    const { error } = this.state;

    if (error) return;

    const { task } = propsToData(this.props);

    if (!task?.isTaskReassigned) return;

    this.setState({
      error: {
        message: t('ErrorMessageReassigned')
      }
    });
  };

  setBusy = (busy) => this.setState({ busy });

  setBusyRegister = (pendingRegisters) => this.setState({ pendingRegisters });

  getRootPath = () => {
    const { rootPage, rootPath, taskId } = this.props;

    return rootPage || `${rootPath}/${taskId || ''}`;
  };

  isSystemTask = () => {
    const isSystem = localStorage.getItem('isSystem');

    if (!isSystem) return { isSystem: false };

    const initData = JSON.parse(isSystem) || {};

    localStorage.removeItem('isSystem');

    return { isSystem: true, initData };
  };

  mapSearchParams = () => {
    const { search } = window.location;

    if (!search.length) return null;

    const cleared = decodeURIComponent(search).replace(/<\/?[^>]+>/gi, '');

    const prefixed = qs.parse(cleared, { ignoreQueryPrefix: true });

    if (!Object.keys(prefixed)) return null;

    return prefixed;
  };

  generateBody = (props) => {
    const { workflowTemplateId, taskTemplateId } = props;

    const { isSystem, initData } = this.isSystemTask();
    const searchParams = this.mapSearchParams();

    const body = {
      workflowTemplateId,
      taskTemplateId
    };

    if (isSystem) {
      body.isSystem = true;
      body.initData = initData;
    }

    if (searchParams) {
      body.initData = {
        ...body.initData,
        ...searchParams
      };
    }

    return body;
  };

  checkDraftExpiredDate = (task) => {
    try {
      const { draftExpiredAt, isEntry } = task;

      if (!draftExpiredAt || !isEntry) return;

      const expiredDate = moment(draftExpiredAt);

      const diff = expiredDate.diff(moment(), 'minutes');

      const expired = diff < EXPIRED_DRAFT_TIME;

      if (!expired) return false;

      this.setState({
        draftExpiring: true
      });

      this.expiringTimer = setInterval(() => {
        const diff = expiredDate.diff(moment(), 'seconds');

        if (diff < 0) {
          this.setState({ expiringTimer: '00:00:00' });
          clearInterval(this.expiringTimer);
          return;
        }

        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff - hours * 3600) / 60);
        const seconds = diff - hours * 3600 - minutes * 60;
        const addZero = (num) => (num < 10 ? `0${num}` : num);

        const expiringTimer = `${addZero(hours)}:${addZero(minutes)}:${addZero(seconds)}`;

        this.setState({ expiringTimer });

        if (diff <= 0) {
          const { actions } = this.props;
          const { taskId } = propsToData(this.props);
          actions.deleteDraft(taskId);
          clearInterval(this.expiringTimer);
        }
      }, INTERVAL_TIME);

      return true;
    } catch {
      return false;
    }
  };

  handleStartNewDraft = async () => {
    const { actions } = this.props;
    const { template, taskId } = propsToData(this.props);

    const workflowTemplateId = `${template?.id}`.slice(0, -3);

    const link = `/tasks/create/${workflowTemplateId}/${template.id}`;

    await actions.deleteDraft(taskId);

    window.location.href = link;
  };

  handleCloseDraftExpiring = async () => {
    const { actions } = this.props;
    const { taskId } = propsToData(this.props);

    await actions.deleteDraft(taskId);

    window.location.href = '/workflow';
  };

  init = async (props) => {
    const {
      t,
      actions,
      taskScreens,
      templates,
      taskId,
      stepId,
      workflowTemplateId,
      tasks,
      authInfo
    } = props;

    if (workflowTemplateId) {
      const errors = validateProfile(authInfo, t);

      if (errors.length) {
        history.replace('/profile?required_modal=true');
        return;
      }

      const body = this.generateBody(props);

      const newTask = await actions.createTask(body);

      if (newTask instanceof Error) {
        switch (newTask.message) {
          case 'Error: Only one draft allowed.':
            this.setState({
              error: newTask
            });
            break;
          case 'Error: Invalid entryTaskTemplateId.':
            if (newTask?.details?.disabledText) {
              this.setState({
                error: new Error(newTask.details.disabledText)
              });
            } else {
              this.setState({
                error: new Error(t('FailCreatingTask'))
              });
            }
            break;
          default:
            this.setState({
              error: new Error(isCyrillic(newTask.message) ? newTask.message : t(newTask.message))
            });
            break;
        }
        return;
      }

      this.checkDraftExpiredDate(newTask);

      await actions.getExternalReaderCaptchaList();

      actions.markTaskRead(newTask.id);
      history.replace(this.getRootPath() + newTask.id);
      return;
    }

    this.setState({ initing: true });

    const task = tasks[taskId] || (await actions.loadTask(taskId));

    await actions.getExternalReaderCaptchaList();

    this.checkDraftExpiredDate(task);

    if (task instanceof Error) {
      const translatedMessage = t(task.message);
      const message = isCyrillic(translatedMessage) ? translatedMessage : t('ErrorLoadingTasks');

      this.setState({ error: new Error(message) });
      return;
    }

    const { localizationTexts } = this.props;

    const template = handleTranslateText(
      localizationTexts,
      templates[task.taskTemplateId] || (await actions.loadDocumentTemplate(task.taskTemplateId))
    );

    const taskSettings =
      templates[task.taskTemplateId]?.taskTemplate ||
      (await actions.loadTaskTemplates(task.taskTemplateId));

    this.setState({
      initing: false,
      locked: false
    });

    if ([taskSettings, template].find((item) => item instanceof Error)) {
      this.setState({ error: new Error(t('ErrorLoadingTemplate')) });
      return;
    }

    const forceLargeDocument = template?.jsonSchema?.largePdfFile;

    if (forceLargeDocument) {
      const { startPDFGenerationTime } = task.meta || {};

      if (startPDFGenerationTime) {
        this.setTaskScreen(screens.PROCESSING);
        return;
      }
    }

    const steps = getTemplateSteps(task, template, authInfo);

    const {
      document: { fileId },
      finished
    } = task;

    if (steps && !steps.length && !finished && !fileId) {
      await this.handleSilentTriggers({ finishEditing: true });
      this.handleFinishEditing();
      return;
    }

    if (!taskScreens[taskId]) {
      if (fileId && !stepId) {
        const reGeneratePdf =
          !task.finished &&
          !task.signerUsers.length &&
          !task.document.signatures.length &&
          !task.document.signatureRejections.length;

        if (reGeneratePdf) {
          history.replace(this.getRootPath() + (steps.length ? `/${steps[steps.length - 1]}` : ''));
        } else {
          this.setTaskScreen(screens.PREVIEW);
        }
      } else if (steps.length) {
        const {
          jsonSchema: { greetingsPage }
        } = template;

        this.settingDefaultStep = true;

        const storedSession = await dbStorage.getItem('sessionId');

        if (storedSession && isMobile) {
          const storedTimestamp = await dbStorage.getItem('sessionTimestamp');

          if (Date.now() - storedTimestamp < 120000) {
            return this.setTaskScreen(screens.PREVIEW);
          } else {
            await dbStorage.clear();
          }
        }

        if (!steps.includes(stepId) && !(greetingsPage && !stepId)) {
          return history.replace(this.getRootPath() + '/' + this.getDefaultStep());
        } else {
          this.setTaskScreen(screens.EDIT);
        }
      }
    }

    if (
      !task.meta.isRead &&
      !task.finished &&
      !processList.has('markTaskRead', taskId) &&
      !stepId
    ) {
      processList.set('markTaskRead', actions.markTaskRead, taskId);
    }

    if (
      !task.finished &&
      task.document &&
      (task.document.signatures.length || task.document.signatureRejections.length)
    ) {
      this.setTaskScreen(screens.PREVIEW);
      history.push(this.getRootPath());
    }
  };

  redirectToInvalidPage = (response) => {
    const { t } = this.props;
    const { steps } = propsToData(this.props);

    try {
      const { validated } = this.state;

      const validateErrors = response.map((item) => {
        const { dataPath } = item;

        const defaultBody = {
          dataPath: `.${dataPath}`,
          keyword: 'required',
          path: item.validationParam
        };

        const customBody = {
          keyword: 'required',
          path: dataPath
            .split('.')
            .filter((_, i) => i > 0)
            .join('.')
        };

        if (
          item.validationParam &&
          typeof item.validationParam === 'object' &&
          Object.keys(item.validationParam).length
        ) {
          return defaultBody;
        }

        return customBody;
      });

      const stepName = response[0]?.dataPath.split('.')[0];

      this.setState(
        {
          validateErrors
        },
        () => {
          history.replace(
            this.getRootPath() + `/${steps.includes(stepName) ? stepName : steps[0]}`
          );
        }
      );

      if (validated) {
        this.setState({
          error: new Error(t('ErrorValidatingDocument'))
        });
      } else {
        this.setState({
          validated: true
        });
      }
    } catch {
      this.setState({
        error: new Error(t('ErrorValidatingDocument'))
      });
    }
  };

  getDefaultStep = () => {
    const {
      authInfo: { userId },
      authInfo
    } = this.props;
    const { taskId, task, template } = propsToData(this.props);

    const steps = getTemplateSteps(task, template, authInfo);

    try {
      const savedSteps = JSON.parse(localStorage.getItem('lastStepEdit'))[userId];

      const lastStepSaved = savedSteps[taskId];

      const defaultStep = steps[steps.indexOf(lastStepSaved)];

      if (!defaultStep) return steps[0];

      return defaultStep;
    } catch {
      return steps[0];
    }
  };

  saveLastStepVisited = (props) => {
    try {
      const {
        authInfo: { userId }
      } = this.props;
      const { taskId, stepId } = propsToData(this.props);
      const savedUser = JSON.parse(localStorage.getItem('lastStepEdit') || '{}')[userId];
      const clear = props?.clear;

      const stepsData = JSON.stringify(
        cleenDeep({
          [userId]: {
            ...savedUser,
            [taskId]: clear ? null : stepId
          }
        })
      );

      localStorage.setItem('lastStepEdit', stepsData);
    } catch {
      return false;
    }
  };

  whileDocumentNotSaved = async () => {
    const { task, origin } = propsToData(this.props);

    const properties = getDeltaProperties(task.document.data, origin.document.data);

    if (properties.length) {
      await sleep(100);
      return this.whileDocumentNotSaved();
    }

    return Promise.resolve();
  };

  handleSilentTriggers = async (props = {}) => {
    const { actions } = this.props;
    const {
      taskId,
      stepId,
      task,
      task: { document: { data: documentData = {} } = {}, deleted } = {},
      template
    } = propsToData(this.props);

    if (deleted) return;

    const { finishEditing } = props;

    const triggers = (template?.jsonSchema.calcTriggers || [])
      .filter((trigger) => !trigger.source)
      .filter((trigger) => {
        const { callBeforePdf } = trigger;

        if (finishEditing) {
          if (typeof callBeforePdf === 'boolean') {
            return callBeforePdf;
          } else if (callBeforePdf && typeof callBeforePdf === 'string') {
            const result = evaluate(callBeforePdf, task.document.data);
            return result === true;
          }

          return false;
        }

        return !callBeforePdf;
      })
      .filter(({ step }) => !step || [].concat(step).includes(stepId));

    if (!triggers.length) return;

    await actions.handleSilentTriggers({
      taskId,
      triggers,
      stepData: documentData[stepId],
      documentData,
      actions: { requestExternalData: actions.requestExternalData },
      activityLog: task?.activityLog
    });

    await this.handleStore();
  };

  checkAndUpdateGetter = async () => {
    const { actions } = this.props;
    const { template, task, stepId, taskId } = propsToData(this.props);
    const properties = template?.jsonSchema?.properties;
    paths(properties)
      ?.filter((path) => path.endsWith('.control') && objectPath.get(properties, path) === 'getter')
      ?.map((getterPath) => ({
        ...objectPath.get(properties, getterPath?.replace('.control', '')),
        prevValue: objectPath.get(
          task?.document?.data,
          getterPath.replace(/\.?(properties|control)/g, '')
        )
      }))
      ?.forEach(async (control) => {
        if (typeof control?.value === 'string') {
          let result = evaluate(
            control?.value,
            0,
            task?.document?.data[stepId],
            task?.document?.data
          );

          if (result instanceof Error) return false;

          if (result !== control.prevValue) {
            await actions.loadTask(taskId);
            return true;
          }
        }
        return false;
      });
  };

  handleStore = async () => {
    const { actions, locked } = this.props;
    const { task, origin } = propsToData(this.props);

    const finished = task?.finished;
    const lastUpdateLogId = origin?.lastUpdateLogId;

    const properties = getDeltaProperties(task?.document?.data, origin?.document?.data);

    if (finished || locked || !properties.length) {
      return null;
    }

    const result = await actions.storeTaskDocument({
      task,
      data: { properties },
      params: lastUpdateLogId ? `?last_update_log_id=${lastUpdateLogId}` : ''
    });

    await this.checkAndUpdateGetter();

    return result;
  };

  getHideMainPdf = () => {
    const { task, template } = propsToData(this.props);
    const hideMainPDF = template?.jsonSchema?.hideMainPDF;

    if (hideMainPDF && typeof hideMainPDF === 'boolean') return hideMainPDF;

    if (hideMainPDF && typeof hideMainPDF === 'string') {
      const result = evaluate(hideMainPDF, task.document.data);
      return result instanceof Error ? hideMainPDF : result;
    }

    return null;
  };

  handleFinishEditing = async () => {
    const { actions } = this.props;
    const { taskId, task, template } = propsToData(this.props);
    const finished = task?.finished;

    const expired = this.checkDraftExpiredDate(task);

    if (expired) return;

    this.setState({ busy: true, locked: true });

    await waiter.run(taskId);

    try {
      if (!finished) {
        task.document = await actions.prepareDocument(task?.documentId);

        if (template?.jsonSchema?.updateUserInfo) {
          const userInfoData = await this.updateUserInfo();
          if (userInfoData instanceof Error) {
            this.setState({ busy: false, locked: false });
            return;
          }
        }

        const shouldCommit = !pdfRequired(template, task) && !signRequired(template, task);

        const validateDocumentBeforeCommit = await actions.validateDocument(
          task.documentId,
          true,
          shouldCommit
        );

        if (validateDocumentBeforeCommit instanceof Error) {
          this.redirectToInvalidPage(validateDocumentBeforeCommit?.details);
          this.setState({ busy: false, locked: false });
          return;
        }

        if (shouldCommit) {
          this.setState({ busy: true, locked: true });
          return this.commitDocument();
        }

        this.setState({ busy: true, locked: true });

        const forceLargeDocument = template?.jsonSchema?.largePdfFile;
        const processingSign = (await dbStorage.getItem('sessionId')) && isMobile;

        if (forceLargeDocument) {
          await actions.setStartPDFGenerationTime(taskId, new Date().getTime());
          if (!processingSign) await actions.generatePDFDocument(task.documentId, true);
          this.setTaskScreen(screens.PROCESSING);
          this.setState({ busy: false });
          return;
        } else {
          if (!processingSign && !this.getHideMainPdf()) {
            await actions.generatePDFDocument(task.documentId);
          }
          await actions.loadTask(taskId);
        }
      }
      this.setState({ busy: false, locked: false });
      this.settingDefaultStep = true;
      this.setTaskScreen(screens.PREVIEW);
      return history.push(this.getRootPath());
    } catch (e) {
      console.log('handleFinishEditing error', e);
    }
  };

  backToEdit = () => {
    const { steps } = propsToData(this.props);
    this.setTaskScreen(screens.EDIT);
    this.settingDefaultStep = true;
    history.replace(this.getRootPath() + `/${steps.pop()}`);
  };

  clearCacheAction = async () => {
    const {
      template: { jsonSchema }
    } = propsToData(this.props);
    const { actions } = this.props;

    if (!jsonSchema?.clearExternalReaderCache) return;

    await actions.clearExternalReaderCache();
  };

  commitDocument = async (rawCall) => {
    const { actions, t, isOnboarding } = this.props;
    const {
      taskId,
      task,
      task: { isMeSigner, signerUsers },
      template
    } = propsToData(this.props);

    if (
      !isMeSigner &&
      !template?.jsonSchema?.isContinueSignAvailable &&
      signRequired(template, task) &&
      signerUsers.length
    ) {
      return history.push('/tasks');
    }

    this.setState({ busy: true, locked: true });

    await this.clearCacheAction();

    if (rawCall) {
      const commitResult = await actions.commitTask(taskId);

      await dbStorage.clear();

      if (commitResult instanceof Error) {
        switch (commitResult.message) {
          case 'Error: Commit not available.':
            commitResult.message = t('Commit not available.');
            break;
          case 'AccessError: Entry task not active.':
            commitResult.message = commitResult.details;
            break;
          default:
            commitResult.message = t('ErrorCommitDocument');
            break;
        }
        this.setState({ error: commitResult });
        this.setTaskScreen(screens.ERROR);
      } else {
        this.setTaskScreen(screens.SUCCESS);
      }
    } else {
      this.setTaskScreen(screens.SUCCESS);
    }

    const redirectURL = storage.getItem('redirectURL');

    if (isOnboarding && redirectURL) {
      storage.removeItem('redirectURL');
      window.location.href = redirectURL;
    }
    await actions.loadTask(taskId);

    this.setState({ busy: false });

    this.saveLastStepVisited({ clear: true });

    return true;
  };

  deleteTaskDocument = async () => {
    const { actions } = this.props;
    const { taskId } = propsToData(this.props);

    if (!taskId || this.settingDefaultStep) return;

    await actions.deleteTaskDocument(taskId);
  };

  updateUserInfo = async () => {
    const { actions, authInfo } = this.props;

    const {
      task: {
        document: { data }
      },
      template: { jsonSchema }
    } = propsToData(this.props);
    const newUserData = evaluate(jsonSchema.updateUserInfo, data);

    if (newUserData instanceof Error) {
      throw newUserData;
    }

    if (!newUserData || typeof newUserData !== 'object' || !Object.values(newUserData).length) {
      return;
    }

    const userInfo = await actions.updateUserInfo({
      ...authInfo,
      ...newUserData
    });

    if (userInfo instanceof Error) {
      return userInfo;
    }

    return await actions.requestUserInfo();
  };

  setTaskScreen = (newScreen) => {
    const { taskId, actions, taskScreens } = this.props;

    if ([taskScreens[taskId], this.getCurrentScreen()].includes(newScreen)) {
      return;
    }

    actions.setTaskScreen(taskId, newScreen);

    queueFactory.kill(taskId + '-registers');
  };

  getCurrentScreen = () => {
    const { error } = this.state;
    const { taskScreens } = this.props;
    const { task, template, taskId, steps, stepId } = propsToData(this.props);

    if (error) {
      return screens.ERROR;
    }

    if (!steps || !task || !template) {
      return null;
    }

    const {
      document: { fileId }
    } = task;
    const taskScreen = taskScreens[taskId];
    const isOnboardingTask = [3004001, 161323001, 987823001].includes(
      task.document.documentTemplateId
    );

    if (task.finished) {
      if (screens.SUCCESS === taskScreen || isOnboardingTask) {
        return screens.SUCCESS;
      }
      if (screens.PREVIEW === taskScreen && !stepId && fileId) {
        return screens.PREVIEW;
      }
      return screens.EDIT;
    }

    if (
      ![screens.EDIT, screens.SUCCESS, screens.PROCESSING].includes(taskScreen) &&
      fileId &&
      !stepId
    ) {
      return screens.PREVIEW;
    }

    return taskScreen;
  };

  getDetails = () => {
    const { template, task, stepId } = propsToData(this.props);

    switch (this.getCurrentScreen()) {
      case screens.EDIT: {
        const { stepDetails, steepDetails } =
          (template && stepId && template.jsonSchema.properties[stepId]) || {};

        const details = stepDetails || steepDetails;

        if (!details) return null;

        const { hidden, title, subtitle } = details;

        const detailsEvaluated = { ...details };

        const setField = (name, value) => {
          detailsEvaluated[name] = value instanceof Error ? details[name] : value;
        };

        if (hidden) {
          const isHidden = evaluate(hidden, task.document.data[stepId], task.document.data);
          if (isHidden) return null;
        }

        if (title) {
          const result = evaluate(
            title,
            task.document.data[stepId],
            task.document.data,
            task?.activityLog
          );
          setField('title', result);
        }

        if (subtitle) {
          const result = evaluate(subtitle, task.document.data[stepId], task.document.data);
          setField('subtitle', result);
        }

        return detailsEvaluated;
      }
      case screens.PREVIEW:
        const details = template?.jsonSchema?.printScreen;

        if (!details) return;

        const { title, subtitle } = details;

        const detailsEvaluated = { ...details };

        if (title) {
          const result = evaluate(title, task.document.data);
          detailsEvaluated.title = result instanceof Error ? title : result;
        }

        if (subtitle) {
          const result = evaluate(subtitle, task.document.data);
          detailsEvaluated.subtitle = result instanceof Error ? subtitle : result;
        }

        return detailsEvaluated;
      default:
        return null;
    }
  };

  getTitle = () => {
    const { t } = this.props;
    const { error } = this.state;

    if (error) {
      return t('ErrorDialogTitle');
    }

    const { task, template } = propsToData(this.props);

    if (!template || !task) {
      return t('Loading');
    }

    const evaluatedTitle = evaluate(
      template.jsonSchema.title,
      task.document.data,
      task?.meta,
      task?.activityLog
    );

    if (!(evaluatedTitle instanceof Error)) {
      return evaluatedTitle;
    }

    return template.jsonSchema.title || template.name;
  };

  showStepsMenu = () => {
    const { task, template } = propsToData(this.props);

    if (!template) {
      return false;
    }

    const { jsonSchema } = template;

    if (!jsonSchema?.showStepsMenu) {
      return false;
    }

    const evaluatedHidden = evaluate(jsonSchema?.showStepsMenu, task?.document?.data);

    if (evaluatedHidden instanceof Error) {
      return jsonSchema?.showStepsMenu;
    }

    return evaluatedHidden;
  };

  render() {
    const {
      error,
      locked,
      busy,
      initing,
      validateErrors,
      draftExpiring,
      expiringTimer,
      pendingRegisters
    } = this.state;
    const { t, location, rootPath, actions, debugMode, isOnboarding } = this.props;

    const {
      taskId,
      steps,
      task,
      template,
      template: { jsonSchema } = {}
    } = propsToData(this.props);

    const showSignerList =
      template &&
      template.jsonSchema &&
      signRequired(template, task) &&
      task &&
      task.signerUsers &&
      !!task.signerUsers.length;

    const loading = (!task || !template) && !error;
    const currentScreen = this.getCurrentScreen();

    return (
      <Suspense fallback={<Preloader />}>
        <TaskPageLayout
          {...propsToData(this.props)}
          details={this.getDetails()}
          flexContent={this.getCurrentScreen() === screens.PREVIEW}
          location={location}
          title={this.getTitle()}
          loading={loading}
          debugMode={debugMode}
          showSignerList={showSignerList}
          showStepsMenu={this.showStepsMenu()}
        >
          {currentScreen || isOnboarding ? null : <Preloader flex={true} />}

          {currentScreen === screens.ERROR ? <ErrorScreen error={error} /> : null}

          {currentScreen === screens.SUCCESS ? (
            <SuccessMessage {...jsonSchema} taskId={taskId} rootPath={rootPath} task={task} />
          ) : null}

          {currentScreen === screens.PREVIEW ? (
            <PreviewScreen
              {...this.props}
              locked={locked}
              busy={busy}
              screens={screens}
              setTaskScreen={this.setTaskScreen}
              setBusy={this.setBusy}
              handleFinish={this.commitDocument}
              backToEdit={this.backToEdit}
              steps={steps}
              getRootPath={this.getRootPath}
            />
          ) : null}

          {currentScreen === screens.EDIT ? (
            <EditScreen
              {...this.props}
              self={this}
              locked={locked}
              busy={busy}
              pendingRegisters={pendingRegisters}
              debugMode={debugMode}
              validateErrors={validateErrors}
              initing={initing}
              rootPath={rootPath}
              title={this.getTitle()}
              setBusy={this.setBusy}
              setBusyRegister={this.setBusyRegister}
              handleFinish={this.handleFinishEditing}
              getRootPath={this.getRootPath}
              details={this.getDetails()}
              handleSilentTriggers={this.handleSilentTriggers}
              handleStore={this.handleStore}
              showStepsMenu={this.showStepsMenu()}
              saveLastStepVisited={this.saveLastStepVisited}
            />
          ) : null}

          {currentScreen === screens.PROCESSING ? (
            <ProcessingScreen
              taskId={taskId}
              screens={screens}
              documentId={task.documentId}
              getRootPath={this.getRootPath}
              setTaskScreen={this.setTaskScreen}
              getPDFDocumentDecoded={actions.getPDFDocumentDecoded}
              setStartPDFGenerationTime={actions.setStartPDFGenerationTime}
            />
          ) : null}
        </TaskPageLayout>
        <ConfirmDialog
          open={draftExpiring}
          acceptButtonText={t('CreateNewDraft')}
          cancelButtonText={t('GoToWorkflow')}
          handleConfirm={this.handleStartNewDraft}
          handleClose={this.handleCloseDraftExpiring}
        >
          <Disclaimer
            noMargin={true}
            text={
              expiringTimer === '00:00:00'
                ? t('DeleteDraft')
                : t('DeleteDraftTimer', { timer: expiringTimer })
            }
          />
        </ConfirmDialog>
      </Suspense>
    );
  }
}

const mapStateToProps = ({
  task,
  app: { localizationTexts },
  documentTemplate,
  files: { pdfDocuments },
  auth: {
    info,
    info: { onboardingTaskId },
    debugMode
  }
}) => ({
  tasks: task.actual,
  taskScreens: task.screens,
  origins: task.origin,
  templates: documentTemplate.actual,
  onboardingTaskId,
  debugMode,
  authInfo: info,
  localizationTexts,
  pdfDocuments
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    loadTask: bindActionCreators(loadTask, dispatch),
    createTask: bindActionCreators(createTask, dispatch),
    commitTask: bindActionCreators(commitTask, dispatch),
    deleteTaskDocument: bindActionCreators(deleteTaskDocument, dispatch),
    setTaskStep: bindActionCreators(setTaskStep, dispatch),
    setTaskScreen: bindActionCreators(setTaskScreen, dispatch),
    clearStepAndScreen: bindActionCreators(clearStepAndScreen, dispatch),
    generatePDFDocument: bindActionCreators(generatePDFDocument, dispatch),
    getPDFDocumentDecoded: bindActionCreators(getPDFDocumentDecoded, dispatch),
    loadDocumentTemplate: bindActionCreators(loadDocumentTemplate, dispatch),
    loadTaskTemplates: bindActionCreators(loadTaskTemplates, dispatch),
    markTaskRead: bindActionCreators(markTaskRead, dispatch),
    prepareDocument: bindActionCreators(prepareDocument, dispatch),
    validateDocument: bindActionCreators(validateDocument, dispatch),
    downloadDocumentAttach: bindActionCreators(downloadDocumentAttach, dispatch),
    setStartPDFGenerationTime: bindActionCreators(setStartPDFGenerationTime, dispatch),
    clearExternalReaderCache: bindActionCreators(clearExternalReaderCache, dispatch),
    updateUserInfo: bindActionCreators(updateUserInfo, dispatch),
    requestUserInfo: bindActionCreators(requestUserInfo, dispatch),
    storeTaskDocument: bindActionCreators(storeTaskDocument, dispatch),
    handleSilentTriggers: bindActionCreators(handleSilentTriggers, dispatch),
    requestExternalData: bindActionCreators(requestExternalData, dispatch),
    setOpenSidebar: bindActionCreators(setOpenSidebar, dispatch),
    deleteDraft: bindActionCreators(deleteDraft, dispatch),
    getExternalReaderCaptchaList: bindActionCreators(getExternalReaderCaptchaList, dispatch)
  }
});

const translated = translate('TaskPage')(TaskPage);

export default connect(mapStateToProps, mapDispatchToProps)(translated);
