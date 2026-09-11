import React from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { history } from 'store';
import objectPath from 'object-path';
import diff from 'deep-diff';

import awaitDelay from 'helpers/awaitDelay';
import evaluate from 'helpers/evaluate';
import renderHTML from 'helpers/renderHTML';
import queueFactory from 'helpers/queueFactory';
import Preloader from 'components/Preloader';
import ErrorScreen from 'components/ErrorScreen';
import * as api from 'services/api';

import {
  ChangeEvent,
  validateDataAsync,
  removeHiddenFields,
  handleActionTriggers
} from 'components/JsonSchema';

import {
  loadTask,
  setTaskStep,
  setTaskSigners,
  putTaskSigners,
  storeTaskDocument,
  applyDocumentDiffs,
  uploadDocumentAttach,
  deleteDocumentAttach,
  calculateFields,
  downloadDocumentAttach,
  setTaskDocumentValues,
  updateTaskDocumentValues,
  getDocumentWorkflowFiles,
  externalReaderCheckData,
  getExternalReaderCaptcha,
  setDefaultValueExecuted,
  setHandleTaskData,
  updateTaskAssign,
  validateDocument,
  setTaskMeta
} from 'application/actions/task';

import { addError } from 'actions/error';
import { downloadFile } from 'application/actions/files';

import waiter from 'helpers/waitForAction';
import deepObjectFind from 'helpers/deepObjectFind';
import parseTaskFromXLSX from 'helpers/parseTaskFromXLSX';

import findPathDeep from 'deepdash/findPathDeep';

import GreetingsPage from 'modules/tasks/pages/Task/screens/EditScreen/components/GreetingsPage';
import EditScreenLayoutRaw from 'modules/tasks/pages/Task/screens/EditScreen/components/EditScreenLayout';

import propsToData from 'modules/tasks/pages/Task/helpers/propsToData';
import removeHiddenStepsData from 'modules/tasks/pages/Task/screens/EditScreen/methods/removeHiddenStepsData';
import triggerInitSignerList from 'modules/tasks/pages/Task/screens/EditScreen/methods/triggerInitSignerList';
import handleHiddenTriggers from 'modules/tasks/pages/Task/screens/EditScreen/methods/handleHiddenTriggers';
import validateUserData from 'modules/tasks/pages/Task/screens/EditScreen/methods/validateUserData';
import Altcha from 'components/Altcha';

import isEmpty from 'helpers/isEmpty';
import flatten from 'helpers/flatten';
import { getConfig } from 'core/helpers/configLoader';

// `EditScreenLayout`'s own export collapses to a zero-prop component type
// (translate()'s generic can't be inferred through its `as any` internal
// cast), same class of issue as the React.lazy() components below —
// widened here rather than touching that already-converted file.
const EditScreenLayout = EditScreenLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;

const STORE_VALUES_INTERVAL = 2000;
const STORE_VALUES_INTERVAL_FORCE = 50;
const STORE_VALUES_INTERVAL_MOMENT = 0;
const PAYMENT_CONTROL_NAMES = ['payment.widget', 'payment.widget.new'];
const ERRORS_LIMIT = 1000;

const w = (text: string) => async () => console.log(text);

interface TaskDocument {
  id?: string | number;
  data: Record<string, unknown>;
  isFinal?: boolean;
  [key: string]: unknown;
}

interface TaskEntity {
  id?: string | number;
  documentId?: string | number;
  document: TaskDocument;
  finished?: boolean;
  deleted?: boolean;
  meta?: { handling?: { userName?: string }; [key: string]: unknown };
  activityLog?: unknown;
  errorTaskSigners?: unknown;
  [key: string]: unknown;
}

interface TemplateJsonSchema {
  properties?: Record<string, Record<string, unknown>>;
  calcTriggers?: Array<Record<string, unknown>>;
  greetingsPage?: unknown;
  importSchema?: unknown;
  saveTaskMeta?: string;
  setTaskMeta?: string;
  [key: string]: unknown;
}

interface TemplateEntity {
  id?: string | number;
  jsonSchema: TemplateJsonSchema;
  taskTemplate?: { setPermissions?: Array<{ reassignTriggers?: Array<{ source?: string }> }> };
  [key: string]: unknown;
}

interface EditScreenData {
  taskId?: string;
  task: TaskEntity;
  origin?: TaskEntity;
  steps: string[];
  template: TemplateEntity;
  stepId?: string;
  workflowTemplateId?: string;
  authInfo: Record<string, unknown>;
}

interface ValidationError {
  path?: string;
  dataPath?: string;
  keyword?: string;
  message?: unknown;
  errorText?: unknown;
  [key: string]: unknown;
}

interface ExternalReaderCheckSuccess {
  requestId?: string;
  status?: string;
  error?: unknown;
  data?: Record<string, unknown>;
}

type ExternalReaderCheckResult = ExternalReaderCheckSuccess | Error;

interface EditScreenActions {
  loadTask: (taskId?: string) => Promise<TaskEntity & { meta?: { handling?: { userName?: string } } } | Error>;
  addError: (error: Error) => void;
  setTaskStep: (taskId?: string, step?: number) => void;
  downloadFile: (item: unknown, asics?: boolean, p7s?: boolean) => Promise<unknown>;
  setTaskSigners: (taskId?: string | number, signers?: unknown) => Promise<unknown>;
  calculateFields: (...args: unknown[]) => Promise<unknown>;
  storeTaskDocument: (...args: unknown[]) => Promise<unknown>;
  applyDocumentDiffs: (
    taskId?: string,
    diffs?: unknown,
    path?: unknown,
    options?: { triggers?: unknown }
  ) => Promise<unknown>;
  uploadDocumentAttach: (documentId?: string | number, ...args: unknown[]) => Promise<unknown>;
  deleteDocumentAttach: (...args: unknown[]) => Promise<unknown>;
  downloadDocumentAttach: (...args: unknown[]) => Promise<unknown>;
  setTaskDocumentValues: (taskId?: string, data?: unknown, ...rest: unknown[]) => Promise<unknown> | unknown;
  updateTaskDocumentValues: (taskId?: string | number, path?: unknown, changes?: unknown, triggers?: unknown, schema?: unknown) => Promise<unknown>;
  getDocumentWorkflowFiles: (documentId?: string | number, stepName?: string, ...args: unknown[]) => Promise<unknown>;
  externalReaderCheckData: (
    documentId?: string | number,
    body?: Record<string, unknown>,
    ignore?: boolean,
    async?: unknown
  ) => Promise<ExternalReaderCheckResult>;
  setDefaultValueExecuted: (taskId?: string, defaultValueExecuted?: string[]) => Promise<unknown>;
  putTaskSigners: (taskId?: string, updateSigners?: string | false) => Promise<unknown>;
  setHandleTaskData: (taskId?: string, data?: Record<string, unknown>) => Promise<unknown>;
  updateTaskAssign: (taskId?: string, userIds?: unknown[]) => Promise<unknown>;
  requestExternalData: (requestData?: unknown) => Promise<unknown>;
  validateDocument: (...args: unknown[]) => Promise<unknown>;
  setTaskMeta: (taskId?: string, meta?: unknown) => Promise<unknown>;
  getExternalReaderCaptcha: (service?: string, method?: string) => Promise<{ challenge?: unknown } | undefined>;
}

interface EditScreenProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  actions: EditScreenActions;
  fileStorage?: Record<string, unknown>;
  busy?: boolean;
  setBusy: (busy: boolean) => void;
  computedMatch?: Record<string, unknown>;
  tasks: Record<string, TaskEntity>;
  origins: Record<string, TaskEntity>;
  templates: Record<string, TemplateEntity>;
  userUnits?: unknown[];
  details?: unknown;
  initing?: boolean;
  handleStore: () => Promise<unknown>;
  showStepsMenu?: boolean;
  validateErrors?: ValidationError[];
  rootPath?: string;
  isOnboarding?: boolean;
  pendingRegisters?: unknown;
  setBusyRegister: (pendingRegisters: unknown) => void;
  title?: unknown;
  getRootPath: () => string;
  self: { settingDefaultStep: boolean };
  handleFinish: () => Promise<unknown>;
  handleSilentTriggers: (props?: { finishEditing?: boolean }) => Promise<unknown>;
  saveLastStepVisited: (props?: { clear?: boolean }) => unknown;
  locked?: boolean;
  taskSteps: Record<string, number>;
  userInfo: Record<string, unknown> & { userId?: string | number; name?: string };
  actual: Record<string, TaskEntity & { errorTaskSigners?: unknown }>;
  captchaEnabled: { isEnabledFor?: string[] };
  debugMode?: boolean;
  taskId?: string;
  stepId?: string;
}

interface EditScreenState {
  processing: boolean;
  validationErrors: ValidationError[];
  validationPageErrors: ValidationError[];
  externalReaderErrors: unknown[];
  storeEventError: unknown;
  blockForward: boolean;
  triggerExternalPath: unknown;
  metaUpdating: boolean;
  defaultValueExecuted: string[];
  loadingModalVisible: boolean;
  loadingModalVisibleErrorText: string | null;
  captchaResult: unknown;
  isExternalReaderCheckRunning?: boolean;
  processingStatus?: boolean;
  pendingMessage?: unknown;
  readOnly?: boolean;
  isProgressBar?: boolean;
  totalErrors?: number;
  captcha?: { challenge?: unknown } | null;
}

class EditScreen extends React.Component<EditScreenProps, EditScreenState> {
  storeInterval: number;
  ignoreEmptyValues: boolean;
  altchaRef: React.RefObject<{ value?: unknown } | null>;
  queue: ReturnType<typeof queueFactory.get>;

  removeHiddenStepsData: () => Promise<void>;
  triggerInitSignerList: (props?: { navigating?: boolean }) => string | false;
  handleHiddenTriggers: (path: string[]) => Promise<void>;
  validateUserData: (step?: string) => Promise<boolean>;

  constructor(props: EditScreenProps) {
    super(props);

    const { taskId, task } = propsToData(props) as EditScreenData;
    const defaultValueExecuted = (task?.meta?.defaultValueExecuted as string[] | undefined) || [];

    const config = getConfig();
    this.storeInterval = (config.storeInterval as number) || STORE_VALUES_INTERVAL;
    this.ignoreEmptyValues = (config.ignoreEmptyValues as boolean) || false;

    this.state = {
      processing: false,
      validationErrors: [],
      validationPageErrors: [],
      externalReaderErrors: [],
      storeEventError: {},
      blockForward: false,
      triggerExternalPath: null,
      metaUpdating: false,
      defaultValueExecuted,
      loadingModalVisible: false,
      loadingModalVisibleErrorText: null,
      captchaResult: null
    };

    this.altchaRef = React.createRef();

    this.queue = queueFactory.get(taskId as string);

    this.queue.on('error', (error: unknown, job: unknown) => {
      console.log('job error:', error, job);
      this.setState({ storeEventError: error });
    });

    this.queue.on('start', async () => {
      this.setState({ processing: true });
    });

    this.queue.on('end', async () => {
      this.setState({ processing: false });
    });

    this.removeHiddenStepsData = removeHiddenStepsData.bind(this);
    this.triggerInitSignerList = triggerInitSignerList.bind(this);
    this.handleHiddenTriggers = handleHiddenTriggers.bind(this);
    this.validateUserData = validateUserData.bind(this);
  }

  setTaskStep = (newStep: number): void => {
    const { taskId, actions } = this.props;

    if (this.getActiveStep() === newStep) {
      return;
    }

    actions.setTaskStep(taskId, newStep);
  };

  getActiveStep = (): number | null => {
    const { taskSteps } = this.props;
    const { steps, stepId, taskId } = propsToData(this.props) as EditScreenData;

    if (!steps) {
      return null;
    }

    if (taskId && taskSteps[taskId] !== undefined) {
      return taskSteps[taskId];
    }

    return steps.includes(stepId as string) ? steps.indexOf(stepId as string) : null;
  };

  componentDidMount(): void {
    const { taskSteps, getRootPath, self } = this.props;

    const { steps, taskId, stepId, template } = propsToData(this.props) as EditScreenData;

    const jsonSchema = template?.jsonSchema || ({} as TemplateJsonSchema);

    const { greetingsPage, properties } = jsonSchema;

    if (stepId === undefined && ((taskId && taskSteps[taskId] !== undefined) || !greetingsPage)) {
      self.settingDefaultStep = true;

      this.handleSetStep(0);
      this.setTaskStep(0);
    }

    window.addEventListener('beforeunload', this.onUnload);

    const selectFilesPath = findPathDeep(properties, (value: unknown) => value === 'verifiedUserInfo');

    if (stepId) {
      (async () => {
        for (let i = 0; i < steps.indexOf(stepId); i++) {
          const stepValid = await this.validateStep(steps[i]);

          let userDataValid = true;
          if (selectFilesPath) {
            userDataValid = await this.validateUserData(steps[i]);
          }
          if (!stepValid || !userDataValid) {
            history.replace(getRootPath() + `/${steps[i]}`);
            break;
          }
        }
      })();
    }

    waiter.addAction(
      taskId + '-updateTaskMetaActions',
      () => {
        this.queue.push(
          w('updateTaskMetaActions'),
          async () => await this.updateTaskMetaActions(true)
        );
      },
      1
    );
  }

  componentWillUnmount(): void {
    window.removeEventListener('beforeunload', this.onUnload);
  }

  onUnload = (event: BeforeUnloadEvent): void => {
    const { processing } = this.state;

    if (!processing) {
      return;
    }

    const listener = event || (window.event as BeforeUnloadEvent);
    listener.preventDefault();
    listener.returnValue = '';
  };

  componentDidUpdate(prevProps: EditScreenProps): void {
    const { stepId: oldStepId } = propsToData(prevProps) as EditScreenData;
    const { stepId: newStepId, steps } = propsToData(this.props) as EditScreenData;

    if (oldStepId !== newStepId) {
      this.setTaskStep(steps.indexOf(newStepId as string));
      this.scrollToTop();
    }
  }

  updateTaskMetaActions = async (initing?: boolean): Promise<void> => {
    const {
      task,
      template
    } = propsToData(this.props) as EditScreenData;
    const { saveTaskMeta, setTaskMeta: setTaskMetaFunction } = template.jsonSchema;

    if (task.finished) return;

    const metaUpdating = !!(initing && (setTaskMetaFunction || saveTaskMeta));

    if (metaUpdating) {
      this.setState({ metaUpdating: true });
    }

    await this.setTaskMetaAction();

    await this.saveTaskMetaAction();

    if (metaUpdating) {
      this.setState({ metaUpdating: false });
    }
  };

  dynErrorText = (errors: ValidationError[]): ValidationError[] => {
    const {
      steps,
      task
    } = propsToData(this.props) as EditScreenData;
    const { data } = task.document;

    if (!errors) return [];

    const stepName = steps[this.getActiveStep() as number];

    const evalErrorText = (text: unknown, path: unknown) => {
      if (!text) return '';
      const propertyValue = objectPath.get(data[stepName], path as string);
      const result = evaluate(text as string, data[stepName], data, propertyValue);
      if (result instanceof Error) return text;
      return result;
    };

    const mapped = (errors || []).map((error) => ({
      ...error,
      message: evalErrorText(error.message, error.path),
      errorText: evalErrorText(error.errorText, error.path)
    }));

    return mapped;
  };

  validatePath = async (path: string[]): Promise<boolean> => {
    const {
      steps,
      task,
      template
    } = propsToData(this.props) as EditScreenData;
    const { data } = task.document;
    const { properties } = template.jsonSchema;

    const stepName = steps[this.getActiveStep() as number];
    const stepData = data[stepName];

    const stepProperties = removeHiddenFields((properties as Record<string, unknown>)[stepName] as never, data as never, {
      stepData
    } as never);
    const validationErrors = (await validateDataAsync(stepData as never || {}, stepProperties, data as never)) as ValidationError[];

    const errorsMapped = this.dynErrorText(validationErrors);

    const errorFiltered = errorsMapped.filter((error) => {
      const errorParentPath = (error.path as string).split('.').slice(0, path.length);
      return errorParentPath.join('.') === path.join('.');
    });

    this.setState({
      validationErrors: errorFiltered,
      validationPageErrors: errorFiltered
        .filter((item) => !item.dataPath && !item.path)
        .filter(({ keyword }) => keyword !== 'contactConfirmation')
    });

    return !errorFiltered.length;
  };

  validateStep = async (step?: string, props: { ignorePaymentControl?: boolean } = {}): Promise<boolean> => {
    const {
      steps,
      task,
      template
    } = propsToData(this.props) as EditScreenData;
    const { data } = task.document;
    const schemaProperties = template.jsonSchema.properties;

    const properties = JSON.parse(JSON.stringify(schemaProperties)) as Record<string, Record<string, unknown>>;

    const stepName = step || steps[this.getActiveStep() as number];
    const stepData = data[step || stepName];

    if (!stepName || !properties[step || stepName]) {
      return true;
    }

    const stepProperties = removeHiddenFields(properties[step || stepName] as never, data as never, { stepData } as never);

    const totalErrors = (await validateDataAsync(data[step || stepName] as never || {}, stepProperties, data as never)) as ValidationError[];

    const validationErrors = totalErrors.slice(0, ERRORS_LIMIT).filter(({ path }) => {
      if (!props?.ignorePaymentControl) return true;

      const schema = objectPath.get(
        (stepProperties as { properties?: unknown })?.properties || {},
        (path?.split('.').filter(Boolean)) as never
      ) as { control?: string };

      const isPaymentRequired = PAYMENT_CONTROL_NAMES.includes(schema.control as string);

      return !isPaymentRequired;
    });

    const errorsMapped = this.dynErrorText(validationErrors);

    if (!step) {
      this.setState(
        {
          totalErrors: totalErrors.length,
          validationErrors: errorsMapped,
          validationPageErrors: errorsMapped
            .filter((item) => !item.dataPath && !item.path)
            .filter(({ keyword }) => keyword !== 'contactConfirmation')
        },
        () => this.scrollToInvalidField(validationErrors)
      );
    }

    if (validationErrors && validationErrors.length) {
      console.log('validation.errors', validationErrors, data[step || stepName]);
    }

    return !Object.keys(validationErrors).length;
  };

  validatePage = async (): Promise<boolean> => {
    const {
      task,
      template
    } = propsToData(this.props) as EditScreenData;
    const { data } = task.document;
    const { jsonSchema } = template;

    const schema = JSON.parse(JSON.stringify(jsonSchema)) as Record<string, Record<string, unknown>> & { properties: Record<string, unknown> };

    const jsonSchemaProperties = Object.keys(schema.properties).reduce(
      (acc, propertyName) => ({
        ...acc,
        [propertyName]: {
          ...(schema[propertyName] as Record<string, unknown>),
          required: [],
          properties: {}
        }
      }),
      {}
    );

    const pageProperties = removeHiddenFields(
      {
        ...schema,
        properties: jsonSchemaProperties
      } as never,
      data as never
    );

    let errors: ValidationError[] = [];
    try {
      errors = (await validateDataAsync(data as never, pageProperties, data as never)) as ValidationError[];
    } catch (e) {
      console.log('validate.page.error', e);
    }
    const validationPageErrors = errors.filter(({ keyword }) => keyword !== 'contactConfirmation');

    console.log('validation.page.errors', validationPageErrors, data);

    const { validationErrors } = this.state;

    this.setState({
      validationPageErrors: this.dynErrorText(validationPageErrors).concat(
        validationErrors.filter(({ path }) => !(path || '').length)
      )
    });

    return !Object.keys(validationPageErrors).length;
  };

  setExternalErrorMessage = (result: unknown, serviceErrorMessage?: string): void => {
    if (!serviceErrorMessage) return;

    let evaluatedErrorMessage: unknown = evaluate(serviceErrorMessage, result);

    if (evaluatedErrorMessage instanceof Error) {
      evaluatedErrorMessage = serviceErrorMessage;
    }

    this.setState({
      externalReaderErrors: [evaluatedErrorMessage]
    });
  };

  handleLoadingModalVisible = (props: boolean): void => {
    this.setState({ loadingModalVisible: props });
  };

  externalReaderCheck = async (props: {
    asyncReader?: { requestId?: string };
    path?: string;
    readersToCall?: string[];
    blockNavigate?: boolean;
    callback?: () => Promise<unknown>;
    finishExternalReader?: boolean;
  } = {}): Promise<boolean | void> => {
    const {
      stepId,
      taskId,
      task,
      template
    } = propsToData(this.props) as EditScreenData;
    const { documentId, finished } = task;
    const { properties } = template.jsonSchema;
    const { t, actions, setBusy, handleSilentTriggers, handleStore, captchaEnabled } = this.props;
    const { triggerExternalPath, isExternalReaderCheckRunning } = this.state;
    const stepSchema = (properties?.[stepId as string] || {}) as Record<string, Record<string, unknown>>;
    const isLastStep = this.isLastStep();

    await handleStore();
    const { task: root } = propsToData(this.props) as EditScreenData;
    const documentData = (root && root.document && root.document.data) || {};

    const requestIds: Array<{ requestId?: string; path?: string; asyncReader?: boolean; asyncRequestTime?: unknown }> = [];
    const arrayExternalReaderCheck: Array<Record<string, unknown> & { key?: string; path?: string }> = [];
    const asyncReader = props?.asyncReader?.requestId;

    if (asyncReader) {
      requestIds.push({
        requestId: asyncReader,
        path: props?.path,
        asyncReader: true
      });
    }

    const requestExternalReaderCheck = (obj: Record<string, unknown>, path: string[] = []) => {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const newPath = [...path, key];
          const value = obj[key] as Record<string, unknown> | undefined;
          if (
            value?.control === 'externalReaderCheck' &&
            (value?.async || value?.asyncOnStep)
          ) {
            if (arrayExternalReaderCheck.every((item) => item.path !== newPath.join('.'))) {
              const checking = evaluate(value.isChecking as string, documentData[stepId as string], documentData);
              if (checking) {
                arrayExternalReaderCheck.push({
                  key,
                  path: newPath.join('.'),
                  ...value
                });
              }
            }
          }
          if (typeof value === 'object' && !Array.isArray(value)) {
            requestExternalReaderCheck(value as Record<string, unknown>, newPath);
          }
        }
      }
    };

    requestExternalReaderCheck(properties as Record<string, unknown>);

    const asyncOnStepEl = arrayExternalReaderCheck.some((el) => el.path?.split('.')[0] === stepId);

    if ((isLastStep || asyncOnStepEl) && arrayExternalReaderCheck.length) {
      const delay = 10000;
      const errorText = t('AsyncReaderErrorText');
      let errors = false;
      if (!asyncOnStepEl) {
        await this.loadTaskAction();

        this.setState({
          loadingModalVisible: true,
          processingStatus: true,
          loadingModalVisibleErrorText: null
        });

        const findRequestIds = async (obj: Record<string, unknown>, path: string[] = []): Promise<boolean | void> => {
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              const newPath = [...path, key];
              const currentPath = newPath.join('.');
              const value = obj[key] as Record<string, unknown> | undefined;

              if (value && value.requestIdAsyncReaderCheck) {
                requestIds.push({
                  requestId: value.requestIdAsyncReaderCheck as string,
                  asyncRequestTime: value.asyncRequestTime,
                  path: newPath.join('.')
                });
              }

              if (value && value?.error) {
                const found = arrayExternalReaderCheck.find(
                  (item) => item.key === key && item.path === currentPath
                ) || {};
                const { service, method, path, asyncRequestTime } = found as {
                  service?: string;
                  method?: string;
                  path?: string;
                  asyncRequestTime?: unknown;
                };
                if (
                  !arrayExternalReaderCheck.find(
                    (item) => item.key === key && item.path === currentPath
                  )
                )
                  return true;
                errors = true;
                if (isExternalReaderCheckRunning) return;

                if (service && method && path) {
                  const body: Record<string, unknown> = {
                    service,
                    method,
                    path
                  };

                  const result = (await actions.externalReaderCheckData(
                    documentId,
                    body,
                    false,
                    true
                  )) as ExternalReaderCheckSuccess;
                  this.setState({ isExternalReaderCheckRunning: true });
                  const newData = { ...documentData };
                  const updateDocumentAndStore = async () => {
                    await actions.setTaskDocumentValues(taskId, newData);
                    await handleStore();
                  };

                  if (result.requestId) {
                    objectPath.set(newData, path, {
                      requestIdAsyncReaderCheck: result.requestId,
                      asyncRequestTime
                    });
                    await updateDocumentAndStore();
                    await awaitDelay(100);
                    await this.externalReaderCheck();
                  } else {
                    const checkingResult = objectPath.get(result.data, path);
                    objectPath.set(newData, path, checkingResult);
                    await updateDocumentAndStore();
                  }

                  this.setState({ isExternalReaderCheckRunning: false });

                  if (!result.requestId) {
                    return;
                  }
                }
              }

              if (typeof value === 'object' && !Array.isArray(value)) {
                await findRequestIds(value as Record<string, unknown>, newPath);
              }
            }
          }
        };

        await findRequestIds(documentData);
      }

      for (const { requestId, asyncRequestTime, path } of requestIds) {
        const body = { requestId };
        const maxAttempts = asyncRequestTime ? Math.floor((asyncRequestTime as number) / 10) : 30;
        let attempts = 0;
        let checkStatus = true;
        let result: ExternalReaderCheckResult;

        do {
          result = await actions.externalReaderCheckData(documentId, body, true, true);
          checkStatus = !(result instanceof Error) && result?.status === 'processing';

          if (
            result instanceof Error ||
            (checkStatus && attempts === maxAttempts - 1) ||
            (!(result instanceof Error) && result?.error)
          ) {
            const newData = { ...documentData };
            errors = true;
            objectPath.set(newData, path as string, {
              error: true,
              asyncRequestTime
            });
            this.setState({
              processingStatus: false,
              loadingModalVisibleErrorText: errorText
            });
            await actions.setTaskDocumentValues(taskId, newData);
            await handleStore();
          } else if (!checkStatus) {
            const newData = { ...documentData };
            const checkingResult = objectPath.get((result as ExternalReaderCheckSuccess).data, path as string);
            objectPath.set(newData, path as string, checkingResult);
            await actions.setTaskDocumentValues(taskId, newData);
            await awaitDelay(100);
            await handleStore();
            this.setState({
              loadingModalVisible: false,
              processingStatus: false
            });
            await this.loadTaskAction();
            return true;
          }

          if (checkStatus) {
            attempts++;
            if (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        } while (checkStatus && attempts < maxAttempts);
      }
      if (errors) return;

      this.setState({ loadingModalVisible: false, processingStatus: false });
      await this.loadTaskAction();
    }

    const { readersToCall, blockNavigate, callback } = props || {};

    const asyncCheck = (Object.keys(stepSchema)
      .map((key) => ({
        key,
        ...(stepSchema[key] as Record<string, unknown>)
      })) as Array<Record<string, unknown> & { key: string }>)
      .filter((prop) => prop.control === 'externalReaderCheck')
      .filter(({ key, checkOnNavigate, cheсkOnNavigate }) => {
        const isCheckOnNavigateValid = [checkOnNavigate, cheсkOnNavigate].includes(false);

        if (blockNavigate) {
          if (readersToCall && !readersToCall.includes(key)) {
            return false;
          }
          if (triggerExternalPath) {
            this.setState({ triggerExternalPath: null });
            return true;
          }
          return !isCheckOnNavigateValid;
        } else {
          return !isCheckOnNavigateValid;
        }
      });

    if (!asyncCheck.length) return true;

    await handleStore();

    const checkIsChecking = (asyncCheck || []).map(({ isChecking }) => isChecking);

    const isCheckingArray = (checkIsChecking || []).map((isCheckingFunc) => {
      const checking = evaluate(isCheckingFunc as string, documentData[stepId as string], documentData);
      return checking !== false;
    });

    const isProgressBar = !(asyncCheck || []).find(({ disableProgressBar }) => disableProgressBar);

    if (isCheckingArray.filter((el) => el === false).length === asyncCheck.length) {
      return true;
    }

    setBusy(true);

    this.setState({ readOnly: true });

    await waiter.run(taskId as string);

    await handleStore();

    this.setState({
      isProgressBar,
      externalReaderErrors: []
    });

    const checkFunc = async (control: Record<string, unknown>, index: number): Promise<boolean | undefined> => {
      const {
        service,
        method,
        path,
        checkValid,
        serviceErrorMessage = t('externalReaderError'),
        messagingOnStep,
        pendingMessage,
        async,
        asyncRequestTime,
        asyncOnStep
      } = control as {
        service?: string;
        method?: string;
        path?: string;
        checkValid?: Array<{ isValid?: string; errorText?: string }>;
        serviceErrorMessage?: string;
        messagingOnStep?: boolean;
        pendingMessage?: unknown;
        async?: unknown;
        asyncRequestTime?: unknown;
        asyncOnStep?: boolean;
      };

      let asyncEval = async;

      if (async && typeof async === 'string') {
        asyncEval = evaluate(async, documentData[stepId as string], documentData);

        if (asyncEval instanceof Error) asyncEval = false;
      }

      if (isCheckingArray[index] === false) return false;

      if (messagingOnStep) this.setState({ triggerExternalPath: null });

      const body: Record<string, unknown> = {
        service,
        method,
        path
      };

      if (!finished) {
        this.setState({ pendingMessage: [pendingMessage] });
        const errorPath = (asyncCheck[index] as { errorPath?: string })?.errorPath;
        const isIgnore = !!errorPath;

        const enabled = (captchaEnabled.isEnabledFor || []).includes(`${service}.${method}`);

        const captcha = !enabled ? null : await actions.getExternalReaderCaptcha(service, method);

        if (captcha?.challenge) {
          this.setState({ captcha });

          await awaitDelay(500);

          const captchaResult = await new Promise((resolve) => {
            const interval = setInterval(() => {
              const captchaResult = this.altchaRef.current?.value;
              if (captchaResult) {
                clearInterval(interval);
                this.setState({ captcha: null });
                resolve(captchaResult);
              }
            }, 1000);
          });

          body.captchaPayload = captchaResult;
        }

        const result = await actions.externalReaderCheckData(
          documentId,
          body,
          isIgnore,
          asyncEval || asyncOnStep
        );

        if ((props?.finishExternalReader && asyncEval) || asyncOnStep) {
          this.setState({
            loadingModalVisible: true,
            processingStatus: true,
            loadingModalVisibleErrorText: null
          });
        }

        const isIgnoreErrorsFunc = (asyncCheck[index] as { ignoreError?: string })?.ignoreError;

        if (result instanceof Error) {
          if (errorPath) {
            const { document } = (propsToData(this.props) as EditScreenData).task;
            const newData = { ...document } as Record<string, unknown>;
            const error = { error: `${result}` };
            const regex = /"traceId":"([^"]+)"/;
            const replacePath = '"traceId":""';
            const resultString = `${result}`;
            const resultMessage = resultString.replace(regex, replacePath);

            const prevError = objectPath.get(newData.data, errorPath) as { error?: string } | undefined;
            const prevErrorMessage = prevError?.error?.replace(regex, replacePath);

            if (prevErrorMessage !== resultMessage) {
              objectPath.set(newData.data as object, errorPath, error);

              await actions.setTaskDocumentValues(taskId, newData.data);
              await handleStore();
            }
          }

          await this.loadTaskAction();

          if (!isIgnoreErrorsFunc) {
            this.setExternalErrorMessage(result, serviceErrorMessage);
            return true;
          }
        }

        if (isIgnoreErrorsFunc) {
          let ignore: unknown = evaluate(
            isIgnoreErrorsFunc,
            result || (result as ExternalReaderCheckSuccess).data || {},
            documentData[stepId as string],
            documentData
          );

          if (ignore instanceof Error) ignore = false;

          if (result instanceof Error && ignore) {
            return;
          }

          if (result instanceof Error && !ignore) {
            this.setExternalErrorMessage(result, serviceErrorMessage);
            return true;
          }
        }

        // By this point `result` cannot still be an Error: the two branches
        // above (ignore/!ignore) both return whenever `result instanceof
        // Error` is true. TS can't infer that cross-branch exhaustiveness on
        // its own, so this cast reflects the real, already-guaranteed shape.
        const successResult = result as ExternalReaderCheckSuccess;

        const { task: root } = propsToData(this.props) as EditScreenData;

        const newData = { ...(root?.document?.data || {}) };

        if (asyncOnStep) {
          if (successResult?.requestId) {
            await this.externalReaderCheck({ asyncReader: successResult, path });
          }
          return;
        }

        if (asyncEval || asyncOnStep) {
          objectPath.set(newData, path as string, {
            requestIdAsyncReaderCheck: successResult.requestId,
            asyncRequestTime
          });

          if (errorPath) {
            objectPath.set(newData, errorPath, undefined);
          }
          await actions.setTaskDocumentValues(taskId, newData);

          if (props?.finishExternalReader) {
            await handleStore();
            awaitDelay(100);
            await this.externalReaderCheck({ asyncReader: successResult, path });
          }
        } else {
          const checkingResult = objectPath.get(successResult.data, path as string);
          objectPath.set(newData, path as string, checkingResult);

          if (errorPath) {
            objectPath.set(newData, errorPath, undefined);
          }

          await actions.setTaskDocumentValues(taskId, newData);

          const errors = (checkValid || [])
            .map(({ isValid, errorText }) => {
              const res = evaluate(
                isValid as string,
                checkingResult,
                (successResult.data as Record<string, unknown>)?.[stepId as string] || {},
                successResult.data || {}
              );
              if (res instanceof Error) return null;
              if (res === false) {
                let errorTextEvaluated: unknown = evaluate(
                  errorText as string,
                  (successResult.data as Record<string, unknown>)?.[stepId as string] || {},
                  successResult.data || {},
                  checkingResult
                );
                if (errorTextEvaluated instanceof Error) {
                  errorTextEvaluated = errorText;
                }
                return renderHTML(errorTextEvaluated as string);
              }
              return null;
            })
            .filter((mss) => mss);

          if (errors.length) {
            const { externalReaderErrors } = this.state;
            this.setState({
              externalReaderErrors: externalReaderErrors.concat(errors[0])
            });
            return true;
          }
        }
      }
      return false;
    };

    const allowNavigate: Array<boolean | undefined> = [];

    for (let i = 0; i < asyncCheck.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      await awaitDelay(250);
      allowNavigate[i] = await checkFunc(asyncCheck[i], i);
    }

    setBusy(false);

    this.setState({ pendingMessage: null });

    const allowed = !(allowNavigate || []).filter(Boolean).length;

    if (callback) {
      if (allowed) {
        setBusy(true);
        this.setState({ readOnly: true });
        try {
          await handleSilentTriggers();
          await callback();
        } catch (storeEventError) {
          this.setState({ storeEventError });
        }
      } else {
        setBusy(false);
        this.setState({ readOnly: false });
      }
      return;
    }

    if (allowed && !blockNavigate) {
      await awaitDelay(100);
      this.incrementStep();
    } else {
      setBusy(true);
      this.setState({ readOnly: true });
      try {
        await handleSilentTriggers();
      } catch (storeEventError) {
        this.setState({ storeEventError });
      }
      this.setState({ readOnly: false });
    }

    setBusy(false);

    this.setState({ readOnly: false });

    return false;
  };

  setTaskMetaAction = async (): Promise<void> => {
    const { actions, userInfo } = this.props;
    const {
      origin,
      taskId,
      task,
      template
    } = propsToData(this.props) as EditScreenData;
    const { setTaskMeta: setTaskMetaFunction } = template.jsonSchema;

    if (!setTaskMetaFunction) return;

    const result = evaluate(setTaskMetaFunction, origin?.document?.data, task, userInfo);

    if (result instanceof Error) return;

    const actualMeta = {
      ...((origin?.meta as Record<string, unknown>) || {}),
      ...(result as Record<string, unknown>)
    };

    const diffs = diff(actualMeta, origin?.meta);

    if (!diffs) return;

    await actions.setTaskMeta(taskId, actualMeta);
  };

  saveTaskMetaAction = async (): Promise<void> => {
    const { actions, handleStore, userInfo, initing } = this.props;
    const {
      origin,
      task,
      taskId,
      template
    } = propsToData(this.props) as EditScreenData;
    const { meta } = task;
    const { saveTaskMeta } = template.jsonSchema;

    const fieldName = 'saveTaskMeta';

    if (!saveTaskMeta) return;

    const result = evaluate(saveTaskMeta, meta, task, userInfo, task?.activityLog);

    if (result instanceof Error) return;

    const diffs = diff(result || {}, (origin?.document?.data as Record<string, unknown>)?.[fieldName] || {});

    if (!diffs) return;

    await actions.updateTaskDocumentValues(taskId, [fieldName], result);

    await handleStore();

    if (initing) {
      await this.loadTaskAction();
      await handleStore();
    }
  };

  incrementStep = async (): Promise<void> =>
    new Promise((resolve) => {
      const { handleStore, handleSilentTriggers, saveLastStepVisited } = this.props;
      const {
        steps,
        task,
        template,
        stepId
      } = propsToData(this.props) as EditScreenData;
      const { properties } = template.jsonSchema;

      const stepSchema = (properties?.[stepId as string] || {}) as { triggerBeforeReader?: boolean };
      const triggerBeforeReader = stepSchema?.triggerBeforeReader || false;
      const activeStep = this.getActiveStep() as number;

      if (task.finished) {
        this.handleSetStep(activeStep + 1);
        resolve();
        return;
      }

      this.queue.push(w('incrementStep'), async () => {
        await this.removeHiddenStepsData();
        if (!triggerBeforeReader) {
          await handleSilentTriggers();
        }
        await handleStore();

        const valid = await this.validateStep();

        const userDataValid = await this.validateUserData();

        if (valid && userDataValid) {
          await this.handleSetNextStep(activeStep, steps);
          saveLastStepVisited();
        }

        this.setState({ readOnly: false }, resolve);
      });
    });

  handleSetStep = async (step: number): Promise<void> => {
    const { getRootPath } = this.props;
    const { steps, taskId } = propsToData(this.props) as EditScreenData;

    if (!steps[step]) {
      return;
    }

    await waiter.run(taskId as string);

    history.replace(getRootPath() + `/${steps[step]}`);
  };

  isStepHidden = (properties: Record<string, Record<string, unknown>>, task: TaskEntity, stepId: string): boolean => {
    const { checkStepHidden } = (properties[stepId] ?? {}) as { checkStepHidden?: unknown };

    if (typeof checkStepHidden === 'string') {
      return !!evaluate(checkStepHidden, task?.document?.data);
    }

    return !!checkStepHidden;
  };

  findNextVisibleStep = (currentStep: number, steps: string[], properties: Record<string, Record<string, unknown>>, task: TaskEntity): number => {
    for (let i = currentStep + 1; i < steps.length; i++) {
      if (!this.isStepHidden(properties, task, steps[i])) {
        return i;
      }
    }
    return steps.length;
  };

  handleSetNextStep = async (activeStep: number, previousSteps: string[]): Promise<void> => {
    const { steps, task, template } = propsToData(this.props) as EditScreenData;
    const properties = (template?.jsonSchema?.properties ?? {}) as Record<string, Record<string, unknown>>;

    const nextStepId = previousSteps
      .slice(activeStep + 1)
      .find((stepId) => steps.includes(stepId) && !this.isStepHidden(properties, task, stepId));

    if (nextStepId) {
      await this.handleSetStep(steps.indexOf(nextStepId));
      return;
    }

    const currentStepId = previousSteps[activeStep];
    const currentStep = steps.indexOf(currentStepId);

    if (currentStep > -1) {
      const next = this.findNextVisibleStep(currentStep, steps, properties, task);

      await this.handleSetStep(next);
    }
  };

  isLastStep = (): boolean => {
    const { steps } = propsToData(this.props) as EditScreenData;
    const isLastStep = this.getActiveStep() === steps.length - 1;
    return isLastStep;
  };

  handleFinish = async (): Promise<void> => {
    const { handleSilentTriggers, actual, actions } = this.props;
    const { taskId } = propsToData(this.props) as EditScreenData;
    const errorTaskSigners = (taskId && actual[taskId]?.errorTaskSigners) || false;

    if (errorTaskSigners) {
      actions.addError(new Error('TaskSignaturesInvalid'));
      return;
    }

    this.queue.push(w('handleFinish1'), async () => await this.removeHiddenStepsData());

    this.queue.push(
      w('handleFinish2'),
      async () => await handleSilentTriggers({ finishEditing: true })
    );

    this.queue.push(w('handleFinish3'), async () => {
      let storeHelperSuccess = false;
      try {
        await this.storeHelper({
          busyOnload: false,
          externalChecking: false,
          initSignersProps: { navigating: true }
        });
        storeHelperSuccess = true;
      } catch (error) {
        console.log('storeHelper.error', error);
      }

      if (storeHelperSuccess) {
        this.queue.push(w('handleFinish4'), async () => {
          const { handleFinish } = this.props;

          const finishActions = async () => {
            await waiter.run(taskId as string);

            const result = await handleFinish();

            if (result instanceof Error) {
              this.setState({ storeEventError: result });
            }
          };

          try {
            await this.externalReaderCheck({ finishExternalReader: true });
          } catch (e) {
            console.error(e);
          }

          const stepValid = await this.validateStep();
          const pageValid = await this.validatePage();
          const userDataValid = await this.validateUserData();
          const isLastStep = this.isLastStep();
          const { externalReaderErrors, loadingModalVisible } = this.state;

          if (
            !handleFinish ||
            !pageValid ||
            !userDataValid ||
            !stepValid ||
            !isLastStep ||
            externalReaderErrors?.length ||
            loadingModalVisible
          )
            return;

          finishActions();
        });
      }
    });
  };

  handleNextStep = async (): Promise<void> => {
    const { setBusy, handleStore, actions, handleSilentTriggers, actual } = this.props;
    const {
      steps,
      task,
      taskId,
      template,
      stepId
    } = propsToData(this.props) as EditScreenData;
    const { properties } = template.jsonSchema;

    const stepSchema = (properties?.[stepId as string] || {}) as { triggerBeforeReader?: boolean };
    const triggerBeforeReader = stepSchema?.triggerBeforeReader || false;
    const activeStep = this.getActiveStep() as number;
    const errorTaskSigners = stepId === (taskId && actual[taskId]?.errorTaskSigners) || false;

    if (errorTaskSigners) {
      actions.addError(new Error('TaskSignaturesInvalid'));
      return;
    }

    this.clearErrors();

    if (task.finished) {
      await this.handleSetStep(activeStep + 1);
      return;
    }

    setBusy(true);

    if (triggerBeforeReader) {
      await handleSilentTriggers();
    }

    if (activeStep < steps.length - 1) {
      setBusy(true);

      const updateSigners = this.triggerInitSignerList({ navigating: true });

      await handleStore();

      try {
        if (updateSigners) {
          await actions.putTaskSigners(taskId, updateSigners);
        }
      } catch (error) {
        setBusy(false);
        return;
      }

      const allowed = await this.externalReaderCheck();

      const stepValid = await this.validateStep();

      const userDataValid = await this.validateUserData();

      if (allowed && stepValid && userDataValid) {
        await this.incrementStep();
      }
    }
    setBusy(false);
  };

  clearErrors = (path?: string): void => {
    if (path) {
      const { validationErrors } = this.state;
      this.setState({
        validationErrors: (validationErrors || []).filter(
          (error) => (error.path as string).indexOf(path) === -1
        )
      });
    } else {
      this.setState({
        validationErrors: [],
        validationPageErrors: [],
        externalReaderErrors: []
      });
    }
  };

  blockForwardNavigation = (blockForward: boolean): void => this.setState({ blockForward });

  handlePrevStep = (): void => {
    const activeStep = this.getActiveStep() as number;

    this.clearErrors();

    if (activeStep > 0) {
      this.handleSetStep(activeStep - 1);
    }
  };

  handleForceStore = async (): Promise<unknown> => {
    const { taskId } = propsToData(this.props) as EditScreenData;
    return waiter.run(taskId as string);
  };

  triggerExternalReader = ({ schema, changes, path }: { schema?: Record<string, unknown>; changes?: unknown; path?: string }): boolean => {
    if (!schema) return false;

    const { task, stepId } = propsToData(this.props) as EditScreenData;
    const { triggerExternalReader } = schema;

    if (!triggerExternalReader) return false;

    const checking = evaluate(
      triggerExternalReader as string,
      changes,
      task.document.data[stepId as string],
      task.document.data
    );

    if (checking === true) {
      this.setState({ triggerExternalPath: path });
      return true;
    }
    this.clearErrors();
    return false;
  };

  handleActionTriggers = async (dataPath: string[], changes: unknown): Promise<void> => {
    const { actions } = this.props;

    const {
      taskId,
      task,
      template
    } = propsToData(this.props) as EditScreenData;
    const { data } = task.document;
    const { calcTriggers } = template.jsonSchema;

    if (!calcTriggers || !calcTriggers.length) {
      return;
    }

    const actionTriggers = calcTriggers.filter(({ action }) => !!action);

    const parentPath = dataPath.slice(0, dataPath.length - 1);
    const parentData = objectPath.get(data, parentPath);

    const documentData = await handleActionTriggers(actionTriggers as never, {
      documentData: data,
      dataPath: dataPath.join('.'),
      value: changes,
      parentData,
      stepData: data[dataPath[0]],
      actions: { requestExternalData: actions.requestExternalData }
    } as never);

    actions.setTaskDocumentValues(taskId, documentData);
  };

  setDefaultValueExecuted = (path: string): Promise<void> =>
    new Promise((resolve) => {
      const { actions } = this.props;
      const { taskId } = propsToData(this.props) as EditScreenData;

      const { defaultValueExecuted } = this.state;

      if (defaultValueExecuted.includes(path)) {
        return;
      }

      this.setState({
        defaultValueExecuted: defaultValueExecuted.concat(path)
      });

      waiter.addAction(
        taskId + '-setDefaultValueExecuted',
        () => {
          this.queue.push(w('setDefaultValueExecuted'), async () => {
            const { defaultValueExecuted: defaultValueExecutedActual } = this.state;
            await actions.setDefaultValueExecuted(taskId, defaultValueExecutedActual);
            resolve();
          });
        },
        STORE_VALUES_INTERVAL
      );
    });

  getSavingInterval = (props: { changes?: unknown; path: string[]; externalChecking?: boolean }): number => {
    const {
      template
    } = propsToData(this.props) as EditScreenData;
    const { taskTemplate } = template;

    try {
      const { changes, path, externalChecking } = props;

      const pathJoined = path.join('.');

      const getReassignTriggers = flatten(
        (taskTemplate?.setPermissions || [])
          .map(({ reassignTriggers }) => reassignTriggers)
          .filter(Boolean) as never[]
      ).map(({ source }: { source?: string }) => source);

      const settingsExists = getReassignTriggers.includes(pathJoined);

      if (settingsExists) return STORE_VALUES_INTERVAL_MOMENT;

      const interval =
        (changes instanceof ChangeEvent && (changes as { force?: boolean }).force) || externalChecking
          ? STORE_VALUES_INTERVAL_FORCE
          : this.storeInterval;

      return interval;
    } catch (e) {
      return this.storeInterval;
    }
  };

  checkExternalReaderFiltersToChange = (path: string[]): void => {
    const {
      stepId,
      template
    } = propsToData(this.props) as EditScreenData;
    const { properties, calcTriggers } = template.jsonSchema;

    const stepSchema = (properties?.[stepId as string] || {}) as Record<string, { control?: string; filters?: Record<string, unknown> }>;

    const readers = Object.values(stepSchema)
      .filter((prop) => prop.control === 'externalReaderCheck')
      .map(({ filters }) => ({ ...filters }));

    if (!readers.length) return;

    const readerFiltersValues = readers.reduce((acc: Record<string, unknown>, reader) => {
      Object.keys(reader).forEach((key) => {
        acc[key] = reader[key];
      });
      return acc;
    }, {});

    if (!Object.keys(readerFiltersValues).length) return;

    const triggers = (calcTriggers || [])
      .filter(({ source }) => source === path.join('.'))
      .map(({ target }) => target);

    const filterChanged = Object.values(readerFiltersValues).find(
      (filter: unknown = '') => (`${filter}`).includes(path.join('.')) || triggers.includes(filter)
    );

    if (filterChanged) {
      this.setState({ externalReaderErrors: [] });
    }
  };

  handleChange = async (...path: unknown[]): Promise<unknown> => {
    const { actions, setBusy, locked } = this.props;
    const { validationErrors, validationPageErrors } = this.state;

    const {
      taskId,
      task,
      template
    } = propsToData(this.props) as EditScreenData;
    const { id, deleted, document, finished } = task;
    const { jsonSchema } = template;

    if (deleted || locked || finished || document.isFinal) return null;

    const changes = path.pop();
    const previousValue = objectPath.get(document.data, path as never);
    const externalChanges = changes instanceof ChangeEvent ? (changes as { data?: unknown }).data : changes;

    if (this.ignoreEmptyValues && isEmpty(previousValue) && isEmpty(changes)) {
      return null;
    }

    const triggers = jsonSchema.calcTriggers || [];
    const pagePath = (path as string[]).slice(1).join('.');
    const schema = objectPath.get(jsonSchema.properties, (path as string[]).join('.properties.')) as Record<string, unknown> & { useHiddenTriggers?: boolean; externalReaderToCall?: unknown; changeOnBlur?: boolean };

    const busyOnload = changes instanceof ChangeEvent && (changes as { busyOnload?: boolean }).busyOnload;

    busyOnload && setBusy(true);

    this.setState({
      validationErrors: (validationErrors || []).filter(
        (error) => error.path !== pagePath || error.path !== ''
      ),
      validationPageErrors: (validationPageErrors || []).filter((error) => error.path !== '')
    });

    await actions.updateTaskDocumentValues(id, path, changes, triggers, schema);

    schema?.useHiddenTriggers && (await this.handleHiddenTriggers(path as string[]));

    waiter.addAction(
      taskId + '-action-triggers',
      () => {
        this.queue.push(w('action-triggers'), async () => this.handleActionTriggers(path as string[], changes));
      },
      1000
    );

    const externalChecking = await this.triggerExternalReader({
      schema,
      changes: externalChanges,
      path: path as never
    });

    this.checkExternalReaderFiltersToChange(path as string[]);

    const readersToCall = schema && (schema.externalReaderToCall as string[] | undefined);

    const interval = this.getSavingInterval({
      changes,
      path: path as string[],
      externalChecking
    });

    const actionId =
      schema?.changeOnBlur && externalChecking ? taskId + '-external-checking' : taskId;

    return waiter.addAction(
      actionId as string,
      () => {
        this.queue.push(w('store'), async () =>
          this.storeHelper({ busyOnload, externalChecking, readersToCall })
        );
      },
      interval
    );
  };

  storeHelper = async ({
    busyOnload,
    externalChecking,
    readersToCall,
    initSignersProps
  }: {
    busyOnload?: boolean;
    externalChecking?: boolean;
    readersToCall?: string[];
    initSignersProps?: { navigating?: boolean };
  } = {}): Promise<unknown> => {
    const { actions, setBusy, locked, handleStore } = this.props;
    const {
      taskId,
      task
    } = propsToData(this.props) as EditScreenData;
    const { deleted, document, finished } = task;

    if (deleted || locked || finished || document.isFinal) return null;

    const updateSigners = this.triggerInitSignerList(initSignersProps);

    busyOnload && setBusy(true);

    const result = await handleStore();

    try {
      if (updateSigners) {
        await actions.putTaskSigners(taskId, updateSigners);
      }
    } catch (error) {
      setBusy(false);
      return;
    }

    externalChecking && (await this.externalReaderCheck({ blockNavigate: true, readersToCall }));

    await this.updateTaskMetaActions();

    setBusy(false);

    return result;
  };

  handleImport = async (file: File): Promise<void> => {
    const { actions, handleStore } = this.props;
    const {
      taskId,
      task,
      template
    } = propsToData(this.props) as EditScreenData;
    const { importSchema } = template.jsonSchema;

    try {
      const data = await parseTaskFromXLSX(file, importSchema as never);

      actions.setTaskDocumentValues(taskId, {
        ...(task.document.data || {}),
        ...(data || {})
      });
      this.queue.push(w('handleImport'), handleStore);
    } catch (e) {
      console.log('import.error', e);
      actions.addError(new Error('FailImportingData'));
    }
  };

  loadTaskAction = async (): Promise<TaskEntity | Error | undefined> => {
    const { actions, setBusy } = this.props;
    const { taskId } = propsToData(this.props) as EditScreenData;

    setBusy(true);
    const task = await actions.loadTask(taskId);
    setBusy(false);
    return task;
  };

  setTaskDocumentValues = async (taskData: unknown, update = true, force?: boolean): Promise<void> => {
    const { actions, handleStore, setBusy } = this.props;
    const { taskId } = propsToData(this.props) as EditScreenData;

    if (force) {
      actions.setTaskDocumentValues(taskId, taskData);
      await handleStore();
      setBusy(false);
      return;
    }

    this.queue.push(w('setTaskDocumentValues'), async () =>
      actions.setTaskDocumentValues(taskId, taskData)
    );

    update &&
      this.queue.push(async () => {
        await handleStore();
        setBusy(false);
      });
  };

  applyDocumentDiffs = async (diffs: Array<{ path: string }>, path: unknown): Promise<unknown> => {
    const { actions } = this.props;

    if (!diffs || !diffs.length) {
      return;
    }

    const {
      taskId,
      template
    } = propsToData(this.props) as EditScreenData;
    const { calcTriggers } = template.jsonSchema;

    this.queue.push(w('applyDocumentDiffs1'), async () =>
      actions.applyDocumentDiffs(taskId, diffs, path, {
        triggers: calcTriggers
      })
    );

    diffs.forEach((diffItem) =>
      this.queue.push(w('applyDocumentDiffs2'), async () =>
        this.handleActionTriggers((path as string[]).concat(diffItem.path), (diffItem as { lhs?: unknown }).lhs)
      )
    );

    return waiter.addAction(
      taskId as string,
      () => this.queue.push(w('applyDocumentDiffs3'), async () => this.storeHelper()),
      STORE_VALUES_INTERVAL
    );
  };

  downloadDocumentAttach = async (item: { downloadToken?: unknown }, asics = false, p7s = false): Promise<unknown> => {
    const { actions } = this.props;
    return item.downloadToken
      ? actions.downloadFile(item, asics, p7s)
      : actions.downloadDocumentAttach(item, asics, p7s);
  };

  scrollToInvalidField = (errors: ValidationError[]): void => {
    if (!errors) return;

    try {
      const firstError = deepObjectFind(errors, (item) => !!(item as { path?: string })?.path) as { path?: string } | undefined;

      if (!firstError) return;

      const replacepath = (firstError?.path as string).replace(/\./g, '-');

      const firstInvalidField =
        document.getElementById(firstError?.path as string) ||
        document.getElementById(replacepath) ||
        document.querySelector(`input[name=${replacepath}]`) ||
        document.querySelector(`input[name=${replacepath.split('-').pop()}]`);

      if (!firstInvalidField) return;

      const type = firstInvalidField.getAttribute('type');
      const isHidden = type === 'hidden' || (firstInvalidField as HTMLElement).style.display === 'none';

      if (isHidden) {
        const parent = firstInvalidField.parentNode;
        (parent as HTMLElement)?.scrollIntoView({ block: 'center' });
      } else {
        firstInvalidField.scrollIntoView({ block: 'center' });
      }
      setTimeout(() => {
        (firstInvalidField as HTMLElement).focus();
      }, 300);
    } catch {
      console.log('scrollToInvalidField errors', errors);
    }
  };

  scrollToTop = (): void => {
    const topPagePart =
      document.querySelector('#steper') ||
      document.querySelector('h1') ||
      document.querySelector('header');
    topPagePart && topPagePart.scrollIntoView();
  };

  onHandleTask = async (): Promise<void> => {
    const { actions, setBusy, userInfo } = this.props;
    const { taskId } = propsToData(this.props) as EditScreenData;

    const result = await actions.loadTask(taskId);

    if (!(result instanceof Error) && result?.meta?.handling?.userName) {
      actions.addError(new Error('HandlingUserExists'));
      return;
    }

    setBusy(true);
    await actions.setHandleTaskData(taskId, {
      userId: userInfo.userId,
      userName: userInfo.name,
      timestamp: new Date()
    });
    await actions.updateTaskAssign(taskId, ([] as unknown[]).concat(userInfo.userId as never));
    await actions.loadTask(taskId);
    setBusy(false);
  };

  onCancelHandlingTask = async (): Promise<void> => {
    const { actions, setBusy } = this.props;
    const { taskId } = propsToData(this.props) as EditScreenData;

    setBusy(true);
    await actions.setHandleTaskData(taskId, {});
    await actions.updateTaskAssign(taskId, []);
    await actions.loadTask(taskId);
    setBusy(false);
  };

  render(): React.ReactNode {
    const { processing } = this.state;
    const {
      t,
      fileStorage,
      actions,
      busy,
      setBusy,
      computedMatch,
      tasks,
      origins,
      templates,
      userUnits,
      details,
      initing,
      handleStore,
      showStepsMenu,
      validateErrors: validateErrorsProps,

      rootPath,
      isOnboarding,
      pendingRegisters,
      setBusyRegister,
      title
    } = this.props;
    const {
      validationErrors,
      validationPageErrors,
      storeEventError,
      externalReaderErrors,
      pendingMessage,
      blockForward,
      triggerExternalPath,
      isProgressBar,
      readOnly,
      metaUpdating,
      totalErrors,
      defaultValueExecuted,
      loadingModalVisible,
      processingStatus,
      loadingModalVisibleErrorText,
      captcha
    } = this.state;
    const {
      task,
      origin,
      template,
      steps,
      stepId
    } = propsToData(this.props) as EditScreenData;
    const { greetingsPage, properties } = template.jsonSchema;

    const activeStep = this.getActiveStep();

    if ((activeStep === null && !greetingsPage) || initing) {
      return <Preloader flex={true} />;
    }

    const stepName = steps[activeStep as number];

    if (stepId === undefined && greetingsPage) {
      return <GreetingsPage {...(greetingsPage as object)} onDone={() => this.handleSetStep(0)} />;
    }

    if (!stepName || metaUpdating) {
      return <Preloader flex={true} />;
    }

    if (!properties?.[stepName]) {
      return <ErrorScreen error={new Error(t('StepNotConfigurated'))} />;
    }

    const pageErrorsConc = validationErrors.concat(validateErrorsProps || []);

    return (
      <>
        <EditScreenLayout
          t={t}
          busy={busy}
          pendingRegisters={pendingRegisters}
          processing={processing}
          task={task}
          origin={origin}
          readOnly={readOnly}
          defaultValueExecuted={defaultValueExecuted}
          actions={{
            setBusy,
            setBusyRegister,
            loadTask: () =>
              new Promise<void>((resolve) => {
                this.queue.push(async () => resolve());
              }),
            loadTaskAction: this.loadTaskAction,
            forceReload: () =>
              new Promise<void>((resolve) => {
                this.queue.push(async () => this.loadTaskAction());
                this.queue.push(async () => await awaitDelay(100));
                this.queue.push(async () => resolve());
              }),
            handleChange: this.handleChange,
            handleStore: () =>
              new Promise<void>((resolve) => {
                this.queue.push(handleStore);
                this.queue.push(async () => resolve());
              }),
            applyDocumentDiffs: this.applyDocumentDiffs,
            setValues: this.setTaskDocumentValues,
            handleForceStore: this.handleForceStore,
            handleDeleteFile: actions.deleteDocumentAttach,
            calculateFields: actions.calculateFields,
            handleDownloadFile: this.downloadDocumentAttach,
            setTaskSigners: actions.setTaskSigners.bind(this, task.id),
            uploadDocumentAttach: actions.uploadDocumentAttach.bind(this, task.documentId),
            getDocumentWorkflowFiles: actions.getDocumentWorkflowFiles.bind(
              this,
              task.documentId,
              stepName
            ),
            scrollToInvalidField: this.scrollToInvalidField,
            clearErrors: this.clearErrors,
            blockForwardNavigation: this.blockForwardNavigation,
            validateStep: this.validateStep,
            validatePath: this.validatePath,
            externalReaderCheck: this.externalReaderCheck,
            setDefaultValueExecuted: this.setDefaultValueExecuted,
            addAction: (action: () => unknown) =>
              new Promise<void>((resolve) => {
                this.queue.push(async () => action());
                this.queue.push(async () => resolve());
              }),
            validateDocument: actions.validateDocument,
            getSavingInterval: this.getSavingInterval,
            handleNextStep: this.handleNextStep
          }}
          rootPath={rootPath}
          userUnits={userUnits}
          storeEventError={storeEventError}
          validationErrors={pageErrorsConc}
          validationPageErrors={validationPageErrors}
          setStoreEventError={(error: unknown) => this.setState({ storeEventError: error })}
          steps={steps}
          stepName={stepName}
          activeStep={activeStep}
          template={template}
          title={title}
          handleSetStep={this.handleSetStep}
          computedMatch={computedMatch}
          fileStorage={fileStorage}
          handleImport={this.handleImport}
          handleChange={this.handleChange}
          handleStore={handleStore}
          handleNextStep={this.handleNextStep}
          handlePrevStep={this.handlePrevStep}
          handleFinish={this.handleFinish}
          tasks={tasks}
          origins={origins}
          templates={templates}
          blockForward={blockForward}
          details={details}
          extReaderMessages={{
            externalReaderErrors,
            pendingMessage,
            triggerExternalPath,
            isProgressBar
          }}
          onHandleTask={this.onHandleTask}
          onCancelHandlingTask={this.onCancelHandlingTask}
          showStepsMenu={showStepsMenu}
          metaUpdating={metaUpdating}
          totalErrors={totalErrors}
          isOnboarding={isOnboarding}
          loadingModalVisible={loadingModalVisible}
          loadingModalVisibleErrorText={loadingModalVisibleErrorText}
          processingStatus={processingStatus}
          handleLoadingModalVisible={this.handleLoadingModalVisible}
        />
        {captcha ? <Altcha ref={this.altchaRef as never} captcha={captcha} /> : null}
      </>
    );
  }
}

(EditScreen as unknown as { propTypes: Record<string, unknown> }).propTypes = {
  actions: PropTypes.object.isRequired,
  tasks: PropTypes.object.isRequired,
  userInfo: PropTypes.object.isRequired,
  origins: PropTypes.object.isRequired,
  templates: PropTypes.object.isRequired,
  handleFinish: PropTypes.func,
  fileStorage: PropTypes.object,
  userUnits: PropTypes.array,
  computedMatch: PropTypes.object,
  setBusy: PropTypes.func,
  busy: PropTypes.bool,
  t: PropTypes.func.isRequired,
  getRootPath: PropTypes.func.isRequired,
  handleSilentTriggers: PropTypes.func.isRequired,
  handleStore: PropTypes.func.isRequired,
  locked: PropTypes.bool.isRequired,
  initing: PropTypes.bool.isRequired,
  taskSteps: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired,
  taskId: PropTypes.string.isRequired,
  showStepsMenu: PropTypes.bool,
  saveLastStepVisited: PropTypes.func,
  validateErrors: PropTypes.array,
  self: PropTypes.object.isRequired,
  actual: PropTypes.object.isRequired
};

(EditScreen as unknown as { defaultProps: Record<string, unknown> }).defaultProps = {
  handleFinish: null,
  fileStorage: {},
  userUnits: [],
  computedMatch: {},
  setBusy: null,
  busy: false,
  showStepsMenu: false,
  saveLastStepVisited: () => {},
  validateErrors: []
};

interface ConnectedState {
  auth: { userUnits?: unknown[]; info: Record<string, unknown> };
  files: { list?: Record<string, unknown> };
  task: { steps: Record<string, number>; actual: Record<string, TaskEntity> };
  externalReader?: { captcha?: { isEnabledFor?: string[] } };
}

const mapStateToProps = ({
  auth: { userUnits, info },
  files: { list: fileStorage },
  task: { steps, actual },
  externalReader
}: ConnectedState) => ({
  fileStorage,
  userUnits,
  userInfo: info,
  taskSteps: steps,
  actual,
  captchaEnabled: externalReader?.captcha || {}
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    loadTask: bindActionCreators(loadTask, dispatch),
    addError: bindActionCreators(addError, dispatch),
    setTaskStep: bindActionCreators(setTaskStep, dispatch),
    downloadFile: bindActionCreators(downloadFile, dispatch),
    setTaskSigners: bindActionCreators(setTaskSigners, dispatch),
    calculateFields: bindActionCreators(calculateFields, dispatch),
    storeTaskDocument: bindActionCreators(storeTaskDocument, dispatch),
    applyDocumentDiffs: bindActionCreators(applyDocumentDiffs, dispatch),
    uploadDocumentAttach: bindActionCreators(uploadDocumentAttach, dispatch),
    deleteDocumentAttach: bindActionCreators(deleteDocumentAttach, dispatch),
    downloadDocumentAttach: bindActionCreators(downloadDocumentAttach, dispatch),
    setTaskDocumentValues: bindActionCreators(setTaskDocumentValues, dispatch),
    updateTaskDocumentValues: bindActionCreators(updateTaskDocumentValues, dispatch),
    getDocumentWorkflowFiles: bindActionCreators(getDocumentWorkflowFiles, dispatch),
    externalReaderCheckData: bindActionCreators(externalReaderCheckData, dispatch),
    setDefaultValueExecuted: bindActionCreators(setDefaultValueExecuted, dispatch),
    putTaskSigners: bindActionCreators(putTaskSigners, dispatch),
    setHandleTaskData: bindActionCreators(setHandleTaskData, dispatch),
    updateTaskAssign: bindActionCreators(updateTaskAssign, dispatch),
    requestExternalData: (requestData: unknown) =>
      api.post('external_reader', requestData, 'REQUEST_EXTERNAL_DATA', dispatch as never),
    validateDocument: bindActionCreators(validateDocument, dispatch),
    setTaskMeta: bindActionCreators(setTaskMeta, dispatch),
    getExternalReaderCaptcha: bindActionCreators(getExternalReaderCaptcha, dispatch)
  }
});

const translated = translate('TaskPage')(EditScreen as never);
export default connect(mapStateToProps as never, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
