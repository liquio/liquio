import React, { Suspense } from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';
import MobileDetect from 'mobile-detect';
import { history } from 'store';
import qs from 'qs';
import cleenDeep from 'clean-deep';
import moment from 'moment';
import paths from 'deepdash/paths';
import objectPath from 'object-path';

import ModulePage, { ModulePageProps } from 'components/ModulePage';
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
import { getLocalizationTexts } from 'actions/localization';
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
import {
  getCurrentLanguageCode,
  getTranslationCandidates,
  pickLocalizedTexts,
} from 'helpers/localization';

const md = new MobileDetect(window.navigator.userAgent);
const isMobile = !!md.mobile();

const SuccessMessage = React.lazy(() =>
  import('modules/tasks/pages/Task/components/SuccessMessage')
) as unknown as React.ComponentType<Record<string, unknown>>;
const TaskPageLayout = React.lazy(() =>
  import('modules/tasks/pages/Task/components/TaskPageLayout')
) as unknown as React.ComponentType<Record<string, unknown>>;
const PreviewScreen = React.lazy(() =>
  import('modules/tasks/pages/Task/screens/PreviewScreen')
) as unknown as React.ComponentType<Record<string, unknown>>;
const EditScreen = React.lazy(() =>
  import('modules/tasks/pages/Task/screens/EditScreen')
) as unknown as React.ComponentType<Record<string, unknown>>;
const ProcessingScreen = React.lazy(() =>
  import('modules/tasks/pages/Task/screens/ProcessingScreen')
) as unknown as React.ComponentType<Record<string, unknown>>;
const ErrorScreen = React.lazy(() =>
  import('components/ErrorScreen')
) as unknown as React.ComponentType<Record<string, unknown>>;

const screens = {
  EDIT: 'edit',
  PREVIEW: 'preview',
  SUCCESS: 'success',
  ERROR: 'error',
  PROCESSING: 'processing'
};

const EXPIRED_DRAFT_TIME = 2;
const INTERVAL_TIME = 1000;

interface TaskDocument {
  data: Record<string, unknown>;
  fileId?: string | number;
  signatures?: unknown[];
  signatureRejections?: unknown[];
  documentTemplateId?: string | number;
}

interface TaskEntity {
  id?: string | number;
  documentId?: string | number;
  document: TaskDocument;
  finished?: boolean;
  deleted?: boolean;
  isMeSigner?: boolean;
  isTaskReassigned?: boolean;
  signerUsers?: unknown[];
  draftExpiredAt?: string;
  isEntry?: boolean;
  meta?: { isRead?: boolean; startPDFGenerationTime?: unknown; [key: string]: unknown };
  activityLog?: unknown;
  taskTemplateId?: string | number;
  message?: string;
  details?: { disabledText?: string; [key: string]: unknown };
  [key: string]: unknown;
}

interface StepDetails {
  hidden?: string;
  title?: unknown;
  subtitle?: unknown;
  [key: string]: unknown;
}

interface TemplateJsonSchema {
  properties?: Record<string, { stepDetails?: StepDetails; steepDetails?: StepDetails; [key: string]: unknown }>;
  calcTriggers?: Array<Record<string, unknown>>;
  title?: unknown;
  largePdfFile?: boolean;
  hideMainPDF?: boolean | string;
  updateUserInfo?: unknown;
  showStepsMenu?: unknown;
  printScreen?: { title?: unknown; subtitle?: unknown; [key: string]: unknown };
  greetingsPage?: unknown;
  clearExternalReaderCache?: boolean;
  isContinueSignAvailable?: boolean;
  [key: string]: unknown;
}

interface TemplateEntity {
  id?: string | number;
  name?: string;
  jsonSchema: TemplateJsonSchema;
  taskTemplate?: unknown;
  [key: string]: unknown;
}

interface TaskPageData {
  taskId?: string;
  task: TaskEntity;
  origin?: TaskEntity;
  steps: string[];
  template: TemplateEntity;
  stepId?: string;
  workflowTemplateId?: string;
  authInfo: Record<string, unknown>;
}

interface LocalizationText {
  key?: string;
  value?: unknown;
  localizationLanguageCode?: string;
}

interface TaskPageActions {
  loadTask: (taskId: string) => Promise<TaskEntity | Error>;
  createTask: (body: Record<string, unknown>) => Promise<TaskEntity | Error>;
  commitTask: (taskId?: string) => Promise<Error | { message?: string; details?: unknown }>;
  deleteTaskDocument: (taskId: string) => Promise<unknown>;
  setTaskStep: (taskId: string, stepId: string) => void;
  setTaskScreen: (taskId?: string, screen?: string) => void;
  clearStepAndScreen: (taskId?: string) => void;
  generatePDFDocument: (documentId?: string | number, force?: boolean) => Promise<unknown>;
  getPDFDocumentDecoded: (...args: unknown[]) => Promise<unknown>;
  loadDocumentTemplate: (taskTemplateId?: string | number) => Promise<TemplateEntity | Error>;
  loadTaskTemplates: (taskTemplateId?: string | number) => Promise<unknown>;
  markTaskRead: (taskId?: string | number) => void;
  prepareDocument: (documentId?: string | number) => Promise<TaskDocument>;
  validateDocument: (
    documentId?: string | number,
    silent?: boolean,
    shouldCommit?: boolean
  ) => Promise<Error & { details?: unknown } | unknown>;
  downloadDocumentAttach: (...args: unknown[]) => Promise<unknown>;
  setStartPDFGenerationTime: (taskId?: string, time?: number) => Promise<unknown>;
  clearExternalReaderCache: () => Promise<unknown>;
  updateUserInfo: (data: Record<string, unknown>) => Promise<unknown | Error>;
  requestUserInfo: () => Promise<unknown>;
  storeTaskDocument: (payload: {
    task: TaskEntity;
    data: { properties: unknown[] };
    params?: string;
  }) => Promise<unknown>;
  handleSilentTriggers: (payload: Record<string, unknown>) => Promise<unknown>;
  requestExternalData: (...args: unknown[]) => Promise<unknown>;
  getLocalizationTexts: (languageCode?: string | null) => Promise<LocalizationText[] | Error>;
  setOpenSidebar: (open: boolean) => void;
  deleteDraft: (taskId?: string) => Promise<unknown>;
  getExternalReaderCaptchaList: () => Promise<unknown>;
}

interface TaskPageProps extends ModulePageProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  actions: TaskPageActions;
  taskScreens: Record<string, string>;
  templates: Record<string, TemplateEntity>;
  taskId?: string;
  stepId?: string;
  workflowTemplateId?: string;
  tasks: Record<string, TaskEntity>;
  origins: Record<string, TaskEntity>;
  authInfo: Record<string, unknown>;
  localizationTexts?: LocalizationText[];
  rootPage?: string;
  rootPath?: string;
  location: unknown;
  debugMode?: boolean;
  isOnboarding?: boolean;
  onboardingTaskId?: string | number;
  pdfDocuments?: unknown;
}

interface TaskPageState {
  busy: boolean;
  error: (Error & { message: string }) | null;
  initing: boolean;
  locked: boolean;
  validateErrors: unknown[];
  expiringTimer: string;
  draftExpiring?: boolean;
  pendingRegisters?: unknown;
  validated?: boolean;
}

class TaskPage extends ModulePage<TaskPageProps> {
  state: TaskPageState = {
    busy: false,
    error: null,
    initing: false,
    locked: false,
    validateErrors: [],
    expiringTimer: ''
  };

  settingDefaultStep = false;

  expiringTimer?: ReturnType<typeof setInterval>;

  isLocalizationKey = (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    return /^[A-Z0-9_]+$/.test(value) && value.includes('_');
  };

  extractLocalizationKey = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;

    if (this.isLocalizationKey(value)) {
      return value;
    }

    const namespacedKeyMatch = value.match(/(?:^|\.)([A-Z0-9_]+)$/);
    const maybeKey = namespacedKeyMatch?.[1];

    if (maybeKey && this.isLocalizationKey(maybeKey)) {
      return maybeKey;
    }

    return null;
  };

  isMissingTranslationValue = (translatedValue: unknown, key: string): boolean => {
    if (typeof translatedValue !== 'string') return true;

    const normalized = translatedValue.trim();

    if (!normalized) return true;
    if (normalized === key) return true;
    if (normalized.endsWith(`.${key}`)) return true;

    return false;
  };

  resolveTitleLocalization = (value: unknown): unknown => {
    const { t, localizationTexts } = this.props;
    const { initing } = this.state;

    const localizationKey = this.extractLocalizationKey(value);

    if (!localizationKey) {
      return value;
    }

    const translatedByStatic = t(localizationKey);

    if (!this.isMissingTranslationValue(translatedByStatic, localizationKey)) {
      return translatedByStatic;
    }

    const selectedLanguageCode = getCurrentLanguageCode({
      fallbackLanguage: 'uk',
    });
    const preferredCandidates = getTranslationCandidates(selectedLanguageCode);
    const preparedTexts = pickLocalizedTexts(localizationTexts, preferredCandidates);
    const matchedText = preparedTexts.find((item) => item?.key === localizationKey)?.value;

    if (matchedText) {
      return matchedText;
    }

    if (initing) {
      return '';
    }

    return localizationKey;
  };

  evalStepDescription = (step: StepDetails): unknown => {
    const { origins, taskId } = this.props;
    const documentData = origins && taskId && origins[taskId] ? origins[taskId].document.data : {};
    const result = evaluate(step.description as string, documentData);
    if (result instanceof Error) return step.description;
    return result;
  };

  componentGetTitle = (): string => {
    const { error } = this.state;
    const { t, taskScreens } = this.props;
    const { template, stepId, taskId } = propsToData(this.props) as TaskPageData;

    if (error) {
      return isCyrillic(error.message) ? error.message : t(error.message);
    }

    if (!template || !template.jsonSchema.properties) {
      return '';
    }

    const step = template.jsonSchema.properties[stepId as string] || {};

    return [
      this.getTitle(),
      this.evalStepDescription(step),
      taskId && taskScreens[taskId] === screens.PREVIEW && t('Preview')
    ]
      .filter(Boolean)
      .join(': ');
  };

  componentDidMount(): void {
    super.componentDidMount();
    this.init(this.props);

    const { actions } = this.props;

    actions.setOpenSidebar(false);
  }

  componentWillUnmount(): void {
    const { actions, debugMode } = this.props;
    const { taskId } = propsToData(this.props) as TaskPageData;

    if (this.getCurrentScreen() === screens.SUCCESS) {
      actions.clearStepAndScreen(taskId);
    }

    if (!debugMode) {
      this.deleteTaskDocument();
    }

    clearInterval(this.expiringTimer);
  }

  componentWillReceiveProps(nextProps: TaskPageProps): void {
    const { taskScreens } = nextProps;

    const {
      taskId: oldTaskId,
      stepId: oldStepId,
      workflowTemplateId: oldWorkflowTemplateId,
      taskTemplateId: oldTaskTemplateId
    } = this.props as TaskPageProps & { taskTemplateId?: string };

    const {
      taskId: newTaskId,
      stepId: newStepId,
      workflowTemplateId: newWorkflowTemplateId,
      taskTemplateId: newTaskTemplateId
    } = nextProps as TaskPageProps & { taskTemplateId?: string };

    if (
      newTaskId !== oldTaskId ||
      oldWorkflowTemplateId !== newWorkflowTemplateId ||
      oldTaskTemplateId !== newTaskTemplateId
    ) {
      this.init(nextProps);
      return;
    }

    if (oldStepId !== newStepId) {
      const { task, taskId, stepId, steps } = propsToData(nextProps) as TaskPageData;
      const {
        document: { fileId }
      } = task;

      if (taskId && !taskScreens[taskId]) {
        if (fileId && !stepId) {
          this.setTaskScreen(screens.PREVIEW);
        } else if (steps.length) {
          this.setTaskScreen(screens.EDIT);
        }
      }
    }

    this.checkAssignParam();
  }

  checkAssignParam = (): void => {
    const { t } = this.props;
    const { error } = this.state;

    if (error) return;

    const { task } = propsToData(this.props) as TaskPageData;

    if (!task?.isTaskReassigned) return;

    this.setState({
      error: {
        message: t('ErrorMessageReassigned')
      }
    });
  };

  setBusy = (busy: boolean): void => this.setState({ busy });

  setBusyRegister = (pendingRegisters: unknown): void => this.setState({ pendingRegisters });

  getRootPath = (): string => {
    const { rootPage, rootPath, taskId } = this.props;

    return rootPage || `${rootPath}/${taskId || ''}`;
  };

  isSystemTask = (): { isSystem: boolean; initData?: unknown } => {
    const isSystem = localStorage.getItem('isSystem');

    if (!isSystem) return { isSystem: false };

    const initData = JSON.parse(isSystem) || {};

    localStorage.removeItem('isSystem');

    return { isSystem: true, initData };
  };

  mapSearchParams = (): Record<string, unknown> | null => {
    const { search } = window.location;

    if (!search.length) return null;

    const cleared = decodeURIComponent(search).replace(/<\/?[^>]+>/gi, '');

    const prefixed = qs.parse(cleared, { ignoreQueryPrefix: true });

    if (!Object.keys(prefixed)) return null;

    return prefixed;
  };

  generateBody = (props: TaskPageProps): Record<string, unknown> => {
    const { workflowTemplateId, taskTemplateId } = props as TaskPageProps & { taskTemplateId?: string };

    const { isSystem, initData } = this.isSystemTask();
    const searchParams = this.mapSearchParams();

    const body: Record<string, unknown> = {
      workflowTemplateId,
      taskTemplateId
    };

    if (isSystem) {
      body.isSystem = true;
      body.initData = initData;
    }

    if (searchParams) {
      body.initData = {
        ...(body.initData as Record<string, unknown>),
        ...searchParams
      };
    }

    return body;
  };

  checkDraftExpiredDate = (task: TaskEntity): boolean => {
    try {
      const { draftExpiredAt, isEntry } = task;

      if (!draftExpiredAt || !isEntry) return false;

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
        const addZero = (num: number) => (num < 10 ? `0${num}` : num);

        const expiringTimer = `${addZero(hours)}:${addZero(minutes)}:${addZero(seconds)}`;

        this.setState({ expiringTimer });

        if (diff <= 0) {
          const { actions } = this.props;
          const { taskId } = propsToData(this.props) as TaskPageData;
          actions.deleteDraft(taskId);
          clearInterval(this.expiringTimer);
        }
      }, INTERVAL_TIME);

      return true;
    } catch {
      return false;
    }
  };

  handleStartNewDraft = async (): Promise<void> => {
    const { actions } = this.props;
    const { template, taskId } = propsToData(this.props) as TaskPageData;

    const workflowTemplateId = `${template?.id}`.slice(0, -3);

    const link = `/tasks/create/${workflowTemplateId}/${template.id}`;

    await actions.deleteDraft(taskId);

    window.location.href = link;
  };

  handleCloseDraftExpiring = async (): Promise<void> => {
    const { actions } = this.props;
    const { taskId } = propsToData(this.props) as TaskPageData;

    await actions.deleteDraft(taskId);

    window.location.href = '/workflow';
  };

  init = async (props: TaskPageProps): Promise<void> => {
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
        const newTaskWithDetails = newTask as Error & { details?: { disabledText?: string } };

        switch (newTask.message) {
          case 'Error: Only one draft allowed.':
            this.setState({
              error: newTask
            });
            break;
          case 'Error: Invalid entryTaskTemplateId.':
            if (newTaskWithDetails?.details?.disabledText) {
              this.setState({
                error: new Error(newTaskWithDetails.details.disabledText)
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

    const task = (taskId && tasks[taskId]) || (await actions.loadTask(taskId as string));

    await actions.getExternalReaderCaptchaList();

    this.checkDraftExpiredDate(task as TaskEntity);

    if (task instanceof Error) {
      const translatedMessage = t(task.message);
      const message = isCyrillic(translatedMessage) ? translatedMessage : t('ErrorLoadingTasks');

      this.setState({ error: new Error(message) });
      return;
    }

    const { localizationTexts } = this.props;

    const selectedLanguageCode = getCurrentLanguageCode({
      fallbackLanguage: 'uk',
    });

    if (!storage.getItem('lang') && selectedLanguageCode) {
      storage.setItem('lang', selectedLanguageCode);
    }

    const preferredCandidates = getTranslationCandidates(selectedLanguageCode);
    let resolvedLocalizationTexts = localizationTexts;

    if (!Array.isArray(resolvedLocalizationTexts) || !resolvedLocalizationTexts.length) {
      const requestedTexts = await actions.getLocalizationTexts(selectedLanguageCode);

      if (Array.isArray(requestedTexts) && requestedTexts.length) {
        resolvedLocalizationTexts = requestedTexts;
      } else {
        const requestedTextsWithoutFilter = await actions.getLocalizationTexts();

        if (Array.isArray(requestedTextsWithoutFilter) && requestedTextsWithoutFilter.length) {
          resolvedLocalizationTexts = requestedTextsWithoutFilter;
        }
      }
    }

    const preparedTexts = pickLocalizedTexts(resolvedLocalizationTexts, preferredCandidates);

    const template = handleTranslateText(
      preparedTexts,
      templates[task.taskTemplateId as string] || (await actions.loadDocumentTemplate(task.taskTemplateId))
    ) as TemplateEntity | Error;

    const taskSettings =
      templates[task.taskTemplateId as string]?.taskTemplate ||
      (await actions.loadTaskTemplates(task.taskTemplateId));

    this.setState({
      initing: false,
      locked: false
    });

    if ([taskSettings, template].find((item) => item instanceof Error)) {
      this.setState({ error: new Error(t('ErrorLoadingTemplate')) });
      return;
    }

    const finalTemplate = template as TemplateEntity;

    const forceLargeDocument = finalTemplate?.jsonSchema?.largePdfFile;

    if (forceLargeDocument) {
      const { startPDFGenerationTime } = task.meta || {};

      if (startPDFGenerationTime) {
        this.setTaskScreen(screens.PROCESSING);
        return;
      }
    }

    const steps = getTemplateSteps(task, finalTemplate, authInfo);

    const {
      document: { fileId },
      finished
    } = task;

    if (steps && !steps.length && !finished && !fileId) {
      await this.handleSilentTriggers({ finishEditing: true });
      this.handleFinishEditing();
      return;
    }

    if (taskId && !taskScreens[taskId]) {
      if (fileId && !stepId) {
        const reGeneratePdf =
          !task.finished &&
          !(task.signerUsers?.length) &&
          !(task.document.signatures?.length) &&
          !(task.document.signatureRejections?.length);

        if (reGeneratePdf) {
          history.replace(this.getRootPath() + (steps.length ? `/${steps[steps.length - 1]}` : ''));
        } else {
          this.setTaskScreen(screens.PREVIEW);
        }
      } else if (steps.length) {
        const {
          jsonSchema: { greetingsPage }
        } = finalTemplate;

        this.settingDefaultStep = true;

        const storedSession = await dbStorage.getItem('sessionId');

        if (storedSession && isMobile) {
          const storedTimestamp = await dbStorage.getItem('sessionTimestamp');

          if (Date.now() - (storedTimestamp as number) < 120000) {
            return this.setTaskScreen(screens.PREVIEW);
          } else {
            await dbStorage.clear();
          }
        }

        if (!steps.includes(stepId) && !(greetingsPage && !stepId)) {
          history.replace(this.getRootPath() + '/' + this.getDefaultStep());
          return;
        } else {
          this.setTaskScreen(screens.EDIT);
        }
      }
    }

    if (
      !task.meta?.isRead &&
      !task.finished &&
      !processList.has('markTaskRead', taskId) &&
      !stepId
    ) {
      processList.set('markTaskRead', actions.markTaskRead as (...args: unknown[]) => unknown, taskId);
    }

    if (
      !task.finished &&
      task.document &&
      ((task.document.signatures?.length ?? 0) || (task.document.signatureRejections?.length ?? 0))
    ) {
      this.setTaskScreen(screens.PREVIEW);
      history.push(this.getRootPath());
    }
  };

  redirectToInvalidPage = (response: Array<{ dataPath: string; validationParam?: unknown }>): void => {
    const { t } = this.props;
    const { steps } = propsToData(this.props) as TaskPageData;

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

  getDefaultStep = (): string => {
    const {
      authInfo,
    } = this.props;
    const { userId } = authInfo as { userId?: string };
    const { taskId, task, template } = propsToData(this.props) as TaskPageData;

    const steps = getTemplateSteps(task, template, authInfo);

    try {
      const savedSteps = (JSON.parse(localStorage.getItem('lastStepEdit') as string) as Record<string, Record<string, string>>)[userId as string];

      const lastStepSaved = savedSteps[taskId as string];

      const defaultStep = steps[steps.indexOf(lastStepSaved)];

      if (!defaultStep) return steps[0];

      return defaultStep;
    } catch {
      return steps[0];
    }
  };

  saveLastStepVisited = (props?: { clear?: boolean }): boolean | void => {
    try {
      const { authInfo } = this.props;
      const { userId } = authInfo as { userId?: string };
      const { taskId, stepId } = propsToData(this.props) as TaskPageData;
      const savedUser = (JSON.parse(localStorage.getItem('lastStepEdit') || '{}') as Record<string, unknown>)[userId as string];
      const clear = props?.clear;

      const stepsData = JSON.stringify(
        cleenDeep({
          [userId as string]: {
            ...(savedUser as Record<string, unknown>),
            [taskId as string]: clear ? null : stepId
          }
        })
      );

      localStorage.setItem('lastStepEdit', stepsData);
    } catch {
      return false;
    }
  };

  whileDocumentNotSaved = async (): Promise<void> => {
    const { task, origin } = propsToData(this.props) as TaskPageData;

    const properties = getDeltaProperties(task.document.data, origin?.document.data);

    if (properties.length) {
      await sleep(100);
      return this.whileDocumentNotSaved();
    }

    return Promise.resolve();
  };

  handleSilentTriggers = async (props: { finishEditing?: boolean } = {}): Promise<void> => {
    const { actions } = this.props;
    const {
      taskId,
      stepId,
      task,
      template
    } = propsToData(this.props) as TaskPageData;
    const documentData = task?.document?.data ?? {};
    const deleted = task?.deleted;

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
      .filter(({ step }) => !step || ([] as unknown[]).concat(step as unknown).includes(stepId));

    if (!triggers.length) return;

    await actions.handleSilentTriggers({
      taskId,
      triggers,
      stepData: (documentData as Record<string, unknown>)[stepId as string],
      documentData,
      actions: { requestExternalData: actions.requestExternalData },
      activityLog: task?.activityLog
    });

    await this.handleStore();
  };

  checkAndUpdateGetter = async (): Promise<void> => {
    const { actions } = this.props;
    const { template, task, stepId, taskId } = propsToData(this.props) as TaskPageData;
    const properties = template?.jsonSchema?.properties;
    (paths(properties) as string[] | undefined)
      ?.filter((path) => path.endsWith('.control') && objectPath.get(properties, path) === 'getter')
      ?.map((getterPath) => ({
        ...(objectPath.get(properties, getterPath?.replace('.control', '')) as Record<string, unknown>),
        prevValue: objectPath.get(
          task?.document?.data,
          getterPath.replace(/\.?(properties|control)/g, '')
        )
      }))
      ?.forEach(async (control: { value?: unknown; prevValue?: unknown }) => {
        if (typeof control?.value === 'string') {
          const result = evaluate(
            control.value,
            0,
            (task?.document?.data as Record<string, unknown>)[stepId as string],
            task?.document?.data
          );

          if (result instanceof Error) return false;

          if (result !== control.prevValue) {
            await actions.loadTask(taskId as string);
            return true;
          }
        }
        return false;
      });
  };

  handleStore = async (): Promise<unknown> => {
    const { actions, locked } = this.props as TaskPageProps & { locked?: boolean };
    const { task, origin } = propsToData(this.props) as TaskPageData;

    const finished = task?.finished;
    const lastUpdateLogId = (origin as (TaskEntity & { lastUpdateLogId?: string }) | undefined)?.lastUpdateLogId;

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

  getHideMainPdf = (): unknown => {
    const { task, template } = propsToData(this.props) as TaskPageData;
    const hideMainPDF = template?.jsonSchema?.hideMainPDF;

    if (hideMainPDF && typeof hideMainPDF === 'boolean') return hideMainPDF;

    if (hideMainPDF && typeof hideMainPDF === 'string') {
      const result = evaluate(hideMainPDF, task.document.data);
      return result instanceof Error ? hideMainPDF : result;
    }

    return null;
  };

  handleFinishEditing = async (): Promise<void> => {
    const { actions } = this.props;
    const { taskId, task, template } = propsToData(this.props) as TaskPageData;
    const finished = task?.finished;

    const expired = this.checkDraftExpiredDate(task);

    if (expired) return;

    this.setState({ busy: true, locked: true });

    await waiter.run(taskId as string);

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
          this.redirectToInvalidPage(
            (validateDocumentBeforeCommit as Error & { details?: Array<{ dataPath: string; validationParam?: unknown }> })
              ?.details as Array<{ dataPath: string; validationParam?: unknown }>
          );
          this.setState({ busy: false, locked: false });
          return;
        }

        if (shouldCommit) {
          this.setState({ busy: true, locked: true });
          this.commitDocument();
          return;
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
          await actions.loadTask(taskId as string);
        }
      }
      this.setState({ busy: false, locked: false });
      this.settingDefaultStep = true;
      this.setTaskScreen(screens.PREVIEW);
      history.push(this.getRootPath());
    } catch (e) {
      console.log('handleFinishEditing error', e);
    }
  };

  backToEdit = (): void => {
    const { steps } = propsToData(this.props) as TaskPageData;
    this.setTaskScreen(screens.EDIT);
    this.settingDefaultStep = true;
    history.replace(this.getRootPath() + `/${steps.pop()}`);
  };

  clearCacheAction = async (): Promise<void> => {
    const {
      template
    } = propsToData(this.props) as TaskPageData;
    const { actions } = this.props;

    if (!template?.jsonSchema?.clearExternalReaderCache) return;

    await actions.clearExternalReaderCache();
  };

  commitDocument = async (rawCall?: boolean): Promise<boolean | void> => {
    const { actions, t, isOnboarding } = this.props;
    const {
      taskId,
      task,
      template
    } = propsToData(this.props) as TaskPageData;
    const { isMeSigner, signerUsers } = task;

    if (
      !isMeSigner &&
      !template?.jsonSchema?.isContinueSignAvailable &&
      signRequired(template, task) &&
      signerUsers?.length
    ) {
      history.push('/tasks');
      return;
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
            commitResult.message = (commitResult as Error & { details?: string }).details as string;
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
    await actions.loadTask(taskId as string);

    this.setState({ busy: false });

    this.saveLastStepVisited({ clear: true });

    return true;
  };

  deleteTaskDocument = async (): Promise<void> => {
    const { actions } = this.props;
    const { taskId } = propsToData(this.props) as TaskPageData;

    if (!taskId || this.settingDefaultStep) return;

    await actions.deleteTaskDocument(taskId);
  };

  updateUserInfo = async (): Promise<unknown> => {
    const { actions, authInfo } = this.props;

    const {
      task,
      template
    } = propsToData(this.props) as TaskPageData;
    const { data } = task.document;
    const { jsonSchema } = template;
    const newUserData = evaluate(jsonSchema.updateUserInfo as string, data);

    if (newUserData instanceof Error) {
      throw newUserData;
    }

    if (!newUserData || typeof newUserData !== 'object' || !Object.values(newUserData).length) {
      return;
    }

    const userInfo = await actions.updateUserInfo({
      ...authInfo,
      ...(newUserData as Record<string, unknown>)
    });

    if (userInfo instanceof Error) {
      return userInfo;
    }

    return await actions.requestUserInfo();
  };

  setTaskScreen = (newScreen: string): void => {
    const { taskId, actions, taskScreens } = this.props;

    if (taskId && [taskScreens[taskId], this.getCurrentScreen()].includes(newScreen)) {
      return;
    }

    actions.setTaskScreen(taskId, newScreen);

    queueFactory.kill(taskId + '-registers');
  };

  getCurrentScreen = (): string | null => {
    const { error } = this.state;
    const { taskScreens } = this.props;
    const { task, template, taskId, steps, stepId } = propsToData(this.props) as TaskPageData;

    if (error) {
      return screens.ERROR;
    }

    if (!steps || !task || !template) {
      return null;
    }

    const {
      document: { fileId }
    } = task;
    const taskScreen = taskId ? taskScreens[taskId] : undefined;
    const isOnboardingTask = [3004001, 161323001, 987823001].includes(
      task.document.documentTemplateId as number
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
      ![screens.EDIT, screens.SUCCESS, screens.PROCESSING].includes(taskScreen as string) &&
      fileId &&
      !stepId
    ) {
      return screens.PREVIEW;
    }

    return taskScreen ?? null;
  };

  getDetails = (): StepDetails | null | undefined => {
    const { template, task, stepId } = propsToData(this.props) as TaskPageData;

    switch (this.getCurrentScreen()) {
      case screens.EDIT: {
        const { stepDetails, steepDetails } =
          (template && stepId && template.jsonSchema.properties?.[stepId]) || {};

        const details = stepDetails || steepDetails;

        if (!details) return null;

        const { hidden, title, subtitle } = details;

        const detailsEvaluated: StepDetails = { ...details };

        const setField = (name: string, value: unknown) => {
          detailsEvaluated[name] = value instanceof Error ? details[name] : value;
        };

        if (hidden) {
          const isHidden = evaluate(hidden, task.document.data[stepId as string], task.document.data);
          if (isHidden) return null;
        }

        if (title) {
          const result = evaluate(
            title as string,
            task.document.data[stepId as string],
            task.document.data,
            task?.activityLog
          );
          setField('title', result);
        }

        if (subtitle) {
          const result = evaluate(subtitle as string, task.document.data[stepId as string], task.document.data);
          setField('subtitle', result);
        }

        return detailsEvaluated;
      }
      case screens.PREVIEW: {
        const details = template?.jsonSchema?.printScreen;

        if (!details) return;

        const { title, subtitle } = details;

        const detailsEvaluated: StepDetails = { ...details };

        if (title) {
          const result = evaluate(title as string, task.document.data);
          detailsEvaluated.title = result instanceof Error ? title : result;
        }

        if (subtitle) {
          const result = evaluate(subtitle as string, task.document.data);
          detailsEvaluated.subtitle = result instanceof Error ? subtitle : result;
        }

        return detailsEvaluated;
      }
      default:
        return null;
    }
  };

  getTitle = (): unknown => {
    const { t } = this.props;
    const { error } = this.state;

    if (error) {
      return t('ErrorDialogTitle');
    }

    const { task, template } = propsToData(this.props) as TaskPageData;

    if (!template || !task) {
      return t('Loading');
    }

    const evaluatedTitle = evaluate(
      template.jsonSchema.title as string,
      task.document.data,
      task?.meta,
      task?.activityLog
    );

    if (!(evaluatedTitle instanceof Error)) {
      return this.resolveTitleLocalization(evaluatedTitle);
    }

    return this.resolveTitleLocalization(template.jsonSchema.title || template.name);
  };

  showStepsMenu = (): unknown => {
    const { task, template } = propsToData(this.props) as TaskPageData;

    if (!template) {
      return false;
    }

    const { jsonSchema } = template;

    if (!jsonSchema?.showStepsMenu) {
      return false;
    }

    const evaluatedHidden = evaluate(jsonSchema?.showStepsMenu as string, task?.document?.data);

    if (evaluatedHidden instanceof Error) {
      return jsonSchema?.showStepsMenu;
    }

    return evaluatedHidden;
  };

  render(): React.ReactNode {
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
      template
    } = propsToData(this.props) as TaskPageData;
    const jsonSchema = template?.jsonSchema;

    const showSignerList = !!(
      template &&
      template.jsonSchema &&
      signRequired(template, task) &&
      task &&
      task.signerUsers &&
      task.signerUsers.length
    );

    const loading = (!task || !template) && !error;
    const currentScreen = this.getCurrentScreen();

    return (
      <Suspense fallback={<Preloader />}>
        <TaskPageLayout
          {...(propsToData(this.props) as Record<string, unknown>)}
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
              {...(this.props as unknown as Record<string, unknown>)}
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
              {...(this.props as unknown as Record<string, unknown>)}
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

interface ConnectedState {
  task: { actual: Record<string, TaskEntity>; screens: Record<string, string>; origin: Record<string, TaskEntity> };
  app: { localizationTexts?: LocalizationText[] };
  documentTemplate: { actual: Record<string, TemplateEntity> };
  files: { pdfDocuments?: unknown };
  auth: {
    info: Record<string, unknown> & { onboardingTaskId?: string | number };
    debugMode?: boolean;
  };
}

const mapStateToProps = ({
  task,
  app: { localizationTexts },
  documentTemplate,
  files: { pdfDocuments },
  auth: {
    info,
    debugMode
  }
}: ConnectedState) => ({
  tasks: task.actual,
  taskScreens: task.screens,
  origins: task.origin,
  templates: documentTemplate.actual,
  onboardingTaskId: info.onboardingTaskId,
  debugMode,
  authInfo: info,
  localizationTexts,
  pdfDocuments
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
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
    getLocalizationTexts: bindActionCreators(getLocalizationTexts, dispatch),
    setOpenSidebar: bindActionCreators(setOpenSidebar, dispatch),
    deleteDraft: bindActionCreators(deleteDraft, dispatch),
    getExternalReaderCaptchaList: bindActionCreators(getExternalReaderCaptchaList, dispatch)
  }
});

const translated = translate('TaskPage')(TaskPage as never);

export default connect(mapStateToProps as never, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
