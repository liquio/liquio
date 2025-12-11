import React from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
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
import EditScreenLayout from 'modules/tasks/pages/Task/screens/EditScreen/components/EditScreenLayout';

import propsToData from 'modules/tasks/pages/Task/helpers/propsToData';
import removeHiddenStepsData from 'modules/tasks/pages/Task/screens/EditScreen/methods/removeHiddenStepsData';
import triggerInitSignerList from 'modules/tasks/pages/Task/screens/EditScreen/methods/triggerInitSignerList';
import handleHiddenTriggers from 'modules/tasks/pages/Task/screens/EditScreen/methods/handleHiddenTriggers';
import validateUserData from 'modules/tasks/pages/Task/screens/EditScreen/methods/validateUserData';
import Altcha from 'components/Altcha';

import isEmpty from 'helpers/isEmpty';
import flatten from 'helpers/flatten';
import { getConfig } from '../../../../../../../core/helpers/configLoader';

const STORE_VALUES_INTERVAL = 2000;
const STORE_VALUES_INTERVAL_FORCE = 50;
const STORE_VALUES_INTERVAL_MOMENT = 0;
const PAYMENT_CONTROL_NAMES = ['payment.widget', 'payment.widget.new'];
const ERRORS_LIMIT = 1000;

const w = (text) => async () => console.log(text);

class EditScreen extends React.Component {
  constructor(props) {
    super(props);

    const { taskId, task: { meta: { defaultValueExecuted = [] } = {} } = {} } = propsToData(props);

    const config = getConfig();
    this.storeInterval = config.storeInterval || STORE_VALUES_INTERVAL;
    this.ignoreEmptyValues = config.ignoreEmptyValues || false;

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

    this.queue = queueFactory.get(taskId);

    this.queue.on('error', (error, job) => {
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

  setTaskStep = (newStep) => {
    const { taskId, actions } = this.props;

    if (this.getActiveStep() === newStep) {
      return;
    }

    actions.setTaskStep(taskId, newStep);
  };

  getActiveStep = () => {
    const { taskSteps } = this.props;
    const { steps, stepId, taskId } = propsToData(this.props);

    if (!steps) {
      return null;
    }

    return taskSteps[taskId] || (steps.includes(stepId) ? steps.indexOf(stepId) : null);
  };

  componentDidMount() {
    const { taskSteps, getRootPath, self } = this.props;

    const { steps, taskId, stepId, template } = propsToData(this.props);

    const jsonSchema = template?.jsonSchema || {};

    const { greetingsPage, properties } = jsonSchema || {};

    if (stepId === undefined && (taskSteps[taskId] !== undefined || !greetingsPage)) {
      self.settingDefaultStep = true;

      this.handleSetStep(0);
      this.setTaskStep(0);
    }

    window.addEventListener('beforeunload', this.onUnload);

    const selectFilesPath = findPathDeep(properties, (value) => value === 'verifiedUserInfo');

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

  componentWillUnmount() {
    window.removeEventListener('beforeunload', this.onUnload);
  }

  onUnload = (event) => {
    const { processing } = this.state;

    if (!processing) {
      return;
    }

    const listener = event || window.event;
    listener.preventDefault();
    listener.returnValue = '';
  };

  componentDidUpdate(prevProps) {
    const { stepId: oldStepId } = propsToData(prevProps);
    const { stepId: newStepId, steps } = propsToData(this.props);

    if (oldStepId !== newStepId) {
      this.setTaskStep(steps.indexOf(newStepId));
      this.scrollToTop();
    }
  }

  updateTaskMetaActions = async (initing) => {
    const {
      task,
      template: {
        jsonSchema: { saveTaskMeta, setTaskMeta: setTaskMetaFunction }
      }
    } = propsToData(this.props);

    if (task.finished) return;

    const metaUpdating = initing && (setTaskMetaFunction || saveTaskMeta);

    if (metaUpdating) {
      this.setState({ metaUpdating: true });
    }

    await this.setTaskMetaAction();

    await this.saveTaskMetaAction();

    if (metaUpdating) {
      this.setState({ metaUpdating: false });
    }
  };

  dynErrorText = (errors) => {
    const {
      steps,
      task: {
        document: { data }
      }
    } = propsToData(this.props);

    if (!errors) return [];

    const stepName = steps[this.getActiveStep()];

    const evalErrorText = (text, path) => {
      if (!text) return '';
      const propertyValue = objectPath.get(data[stepName], path);
      const result = evaluate(text, data[stepName], data, propertyValue);
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

  validatePath = async (path) => {
    const {
      steps,
      task: {
        document: { data }
      },
      template: {
        jsonSchema: { properties }
      }
    } = propsToData(this.props);

    const stepName = steps[this.getActiveStep()];
    const stepData = data[stepName];

    const stepProperties = removeHiddenFields(properties[stepName], data, {
      stepData
    });
    const validationErrors = await validateDataAsync(stepData || {}, stepProperties, data);

    const errorsMapped = this.dynErrorText(validationErrors);

    const errorFiltered = errorsMapped.filter((error) => {
      const errorParentPath = error.path.split('.').slice(0, path.length);
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

  validateStep = async (step, props = {}) => {
    const {
      steps,
      task: {
        document: { data }
      },
      template: {
        jsonSchema: { properties: schemaProperties }
      }
    } = propsToData(this.props);

    const properties = JSON.parse(JSON.stringify(schemaProperties));

    const stepName = step || steps[this.getActiveStep()];
    const stepData = data[step || stepName];

    const stepProperties = removeHiddenFields(properties[step || stepName], data, { stepData });

    const totalErrors = await validateDataAsync(data[step || stepName] || {}, stepProperties, data);

    const validationErrors = totalErrors.slice(0, ERRORS_LIMIT).filter(({ path }) => {
      if (!props?.ignorePaymentControl) return true;

      const schema = objectPath.get(
        stepProperties?.properties || {},
        path?.split('.').filter(Boolean)
      );

      const isPaymentRequired = PAYMENT_CONTROL_NAMES.includes(schema.control);

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

  validatePage = async () => {
    const {
      task: {
        document: { data }
      },
      template: { jsonSchema }
    } = propsToData(this.props);

    const schema = JSON.parse(JSON.stringify(jsonSchema));

    const jsonSchemaProperties = Object.keys(schema.properties).reduce(
      (acc, propertyName) => ({
        ...acc,
        [propertyName]: {
          ...schema[propertyName],
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
      },
      data
    );

    let errors = [];
    try {
      errors = await validateDataAsync(data, pageProperties, data);
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

  setExternalErrorMessage = (result, serviceErrorMessage) => {
    if (!serviceErrorMessage) return;

    let evaluatedErrorMessage = evaluate(serviceErrorMessage, result);

    if (evaluatedErrorMessage instanceof Error) {
      evaluatedErrorMessage = serviceErrorMessage;
    }

    this.setState({
      externalReaderErrors: [evaluatedErrorMessage]
    });
  };

  handleLoadingModalVisible = (props) => {
    this.setState({ loadingModalVisible: props });
  };

  externalReaderCheck = async (props) => {
    const {
      stepId,
      taskId,
      task: { documentId, finished },
      template: {
        jsonSchema: { properties }
      }
    } = propsToData(this.props);
    const { t, actions, setBusy, handleSilentTriggers, handleStore, captchaEnabled } = this.props;
    const { triggerExternalPath, isExternalReaderCheckRunning } = this.state;
    const stepSchema = properties[stepId] || {};
    const isLastStep = this.isLastStep();

    await handleStore();
    const { task: root } = propsToData(this.props);
    const documentData = (root && root.document && root.document.data) || {};

    const requestIds = [];
    const arrayExternalReaderCheck = [];
    const asyncReader = props?.asyncReader?.requestId;

    if (asyncReader) {
      requestIds.push({
        requestId: asyncReader,
        path: props?.path,
        asyncReader: true
      });
    }

    const requestExternalReaderCheck = (obj, path = []) => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const newPath = [...path, key];
          if (
            obj[key]?.control === 'externalReaderCheck' &&
            (obj[key]?.async || obj[key]?.asyncOnStep)
          ) {
            if (arrayExternalReaderCheck.every((item) => item.path !== newPath.join('.'))) {
              const checking = evaluate(obj[key].isChecking, documentData[stepId], documentData);
              if (checking) {
                arrayExternalReaderCheck.push({
                  key,
                  path: newPath.join('.'),
                  ...obj[key]
                });
              }
            }
          }
          if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            requestExternalReaderCheck(obj[key], newPath);
          }
        }
      }
    };

    requestExternalReaderCheck(properties);

    const asyncOnStepEl = arrayExternalReaderCheck.some((el) => el.path.split('.')[0] === stepId);

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

        const findRequestIds = async (obj, path = []) => {
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              const newPath = [...path, key];
              const currentPath = newPath.join('.');

              if (obj[key] && obj[key].requestIdAsyncReaderCheck) {
                requestIds.push({
                  requestId: obj[key].requestIdAsyncReaderCheck,
                  asyncRequestTime: obj[key].asyncRequestTime,
                  path: newPath.join('.')
                });
              }

              if (obj[key] && obj[key]?.error) {
                const { service, method, path, asyncRequestTime } =
                  arrayExternalReaderCheck.find(
                    (item) => item.key === key && item.path === currentPath
                  ) || {};
                if (
                  !arrayExternalReaderCheck.find(
                    (item) => item.key === key && item.path === currentPath
                  )
                )
                  return true;
                errors = true;
                if (isExternalReaderCheckRunning) return;

                if (service && method && path) {
                  const body = {
                    service,
                    method,
                    path
                  };

                  const result = await actions.externalReaderCheckData(
                    documentId,
                    body,
                    false,
                    true
                  );
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

              if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                await findRequestIds(obj[key], newPath);
              }
            }
          }
        };

        await findRequestIds(documentData);
      }

      for (const { requestId, asyncRequestTime, path } of requestIds) {
        const body = { requestId };
        const maxAttempts = asyncRequestTime ? Math.floor(asyncRequestTime / 10) : 30;
        let attempts = 0;
        let checkStatus = true;
        let result;

        do {
          result = await actions.externalReaderCheckData(documentId, body, true, true);
          checkStatus = result?.status === 'processing';

          if (
            result instanceof Error ||
            (checkStatus && attempts === maxAttempts - 1) ||
            result?.error
          ) {
            const newData = { ...documentData };
            errors = true;
            objectPath.set(newData, path, {
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
            const checkingResult = objectPath.get(result.data, path);
            objectPath.set(newData, path, checkingResult);
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

    const asyncCheck = Object.keys(stepSchema)
      .map((key) => ({
        key,
        ...stepSchema[key]
      }))
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
      const checking = evaluate(isCheckingFunc, documentData[stepId], documentData);
      return checking !== false;
    });

    const isProgressBar = !(asyncCheck || []).find(({ disableProgressBar }) => disableProgressBar);

    if (isCheckingArray.filter((el) => el === false).length === asyncCheck.length) {
      return true;
    }

    setBusy(true);

    this.setState({ readOnly: true });

    await waiter.run(taskId);

    await handleStore();

    this.setState({
      isProgressBar,
      externalReaderErrors: []
    });

    const checkFunc = async (control, index) => {
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
      } = control;

      let asyncEval = async;

      if (async && typeof async === 'string') {
        asyncEval = evaluate(async, documentData[stepId], documentData);

        if (asyncEval instanceof Error) asyncEval = false;
      }

      if (isCheckingArray[index] === false) return false;

      if (messagingOnStep) this.setState({ triggerExternalPath: null });

      const body = {
        service,
        method,
        path
      };

      if (!finished) {
        this.setState({ pendingMessage: [pendingMessage] });
        const errorPath = asyncCheck[index]?.errorPath;
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

        const isIgnoreErrorsFunc = asyncCheck[index]?.ignoreError;

        if (result instanceof Error) {
          if (errorPath) {
            const { document } = propsToData(this.props).task;
            const newData = { ...document };
            const error = { error: `${result}` };
            const regex = /"traceId":"([^"]+)"/;
            const replacePath = '"traceId":""';
            const resultString = `${result}`;
            const resultMessage = resultString.replace(regex, replacePath);

            const prevError = objectPath.get(newData.data, errorPath);
            const prevErrorMessage = prevError?.error.replace(regex, replacePath);

            if (prevErrorMessage !== resultMessage) {
              objectPath.set(newData.data, errorPath, error);

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
          let ignore = evaluate(
            isIgnoreErrorsFunc,
            result || result.data || {},
            documentData[stepId],
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

        const { task: root } = propsToData(this.props);

        const newData = { ...(root?.document?.data || {}) };

        if (asyncOnStep) {
          if (result?.requestId) {
            await this.externalReaderCheck({ asyncReader: result, path });
          }
          return;
        }

        if (asyncEval || asyncOnStep) {
          objectPath.set(newData, path, {
            requestIdAsyncReaderCheck: result.requestId,
            asyncRequestTime
          });

          if (errorPath) {
            objectPath.set(newData, errorPath, undefined);
          }
          await actions.setTaskDocumentValues(taskId, newData);

          if (props?.finishExternalReader) {
            await handleStore();
            awaitDelay(100);
            await this.externalReaderCheck({ asyncReader: result, path });
          }
        } else {
          const checkingResult = objectPath.get(result.data, path);
          objectPath.set(newData, path, checkingResult);

          if (errorPath) {
            objectPath.set(newData, errorPath, undefined);
          }

          await actions.setTaskDocumentValues(taskId, newData);

          const errors = (checkValid || [])
            .map(({ isValid, errorText }) => {
              const res = evaluate(
                isValid,
                checkingResult,
                result.data[stepId] || {},
                result.data || {}
              );
              if (res instanceof Error) return null;
              if (res === false) {
                let errorTextEvaluated = evaluate(
                  errorText,
                  result.data[stepId] || {},
                  result.data || {},
                  checkingResult
                );
                if (errorTextEvaluated instanceof Error) {
                  errorTextEvaluated = errorText;
                }
                return renderHTML(errorTextEvaluated);
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

    const allowNavigate = [];

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

  setTaskMetaAction = async () => {
    const { actions, userInfo } = this.props;
    const {
      origin,
      taskId,
      task,
      template: {
        jsonSchema: { setTaskMeta: setTaskMetaFunction }
      }
    } = propsToData(this.props);

    if (!setTaskMetaFunction) return;

    const result = evaluate(setTaskMetaFunction, origin?.document?.data, task, userInfo);

    if (result instanceof Error) return;

    const actualMeta = {
      ...(origin.meta || {}),
      ...result
    };

    const diffs = diff(actualMeta, origin.meta);

    if (!diffs) return;

    await actions.setTaskMeta(taskId, actualMeta);
  };

  saveTaskMetaAction = async () => {
    const { actions, handleStore, userInfo, initing } = this.props;
    const {
      origin,
      task: { meta },
      taskId,
      task,
      template: {
        jsonSchema: { saveTaskMeta }
      }
    } = propsToData(this.props);

    const fieldName = 'saveTaskMeta';

    if (!saveTaskMeta) return;

    const result = evaluate(saveTaskMeta, meta, task, userInfo, task?.activityLog);

    if (result instanceof Error) return;

    const diffs = diff(result || {}, origin?.document?.data[fieldName] || {});

    if (!diffs) return;

    await actions.updateTaskDocumentValues(taskId, [fieldName], result);

    await handleStore();

    if (initing) {
      await this.loadTaskAction();
      await handleStore();
    }
  };

  incrementStep = async () =>
    new Promise((resolve) => {
      const { handleStore, handleSilentTriggers, saveLastStepVisited } = this.props;
      const {
        task,
        template: {
          jsonSchema: { properties }
        },
        stepId
      } = propsToData(this.props);

      const stepSchema = properties[stepId] || {};
      const triggerBeforeReader = stepSchema?.triggerBeforeReader || false;
      const activeStep = this.getActiveStep();

      if (task.finished) {
        return this.handleSetStep(activeStep + 1);
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
          await this.handleSetStep(activeStep + 1);
          saveLastStepVisited();
        }

        this.setState({ readOnly: false }, resolve);
      });
    });

  handleSetStep = async (step) => {
    const { getRootPath } = this.props;
    const { steps, taskId } = propsToData(this.props);

    if (!steps[step]) {
      return;
    }

    await waiter.run(taskId);

    history.replace(getRootPath() + `/${steps[step]}`);
  };

  isLastStep = () => {
    const { steps } = propsToData(this.props);
    const isLastStep = this.getActiveStep() === steps.length - 1;
    return isLastStep;
  };

  handleFinish = async () => {
    const { handleSilentTriggers, actual, actions } = this.props;
    const { taskId } = propsToData(this.props);
    const errorTaskSigners = actual[taskId]?.errorTaskSigners || false;

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
            await waiter.run(taskId);

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

  handleNextStep = async () => {
    const { setBusy, handleStore, actions, handleSilentTriggers, actual } = this.props;
    const {
      steps,
      task,
      taskId,
      template: {
        jsonSchema: { properties }
      },
      stepId
    } = propsToData(this.props);

    const stepSchema = properties[stepId] || {};
    const triggerBeforeReader = stepSchema?.triggerBeforeReader || false;
    const activeStep = this.getActiveStep();
    const errorTaskSigners = stepId === actual[taskId]?.errorTaskSigners || false;

    if (errorTaskSigners) {
      actions.addError(new Error('TaskSignaturesInvalid'));
      return;
    }

    this.clearErrors();

    if (task.finished) {
      return this.handleSetStep(activeStep + 1);
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

  clearErrors = (path) => {
    if (path) {
      const { validationErrors } = this.state;
      this.setState({
        validationErrors: (validationErrors || []).filter(
          (error) => error.path.indexOf(path) === -1
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

  blockForwardNavigation = (blockForward) => this.setState({ blockForward });

  handlePrevStep = () => {
    const activeStep = this.getActiveStep();

    this.clearErrors();

    if (activeStep > 0) {
      this.handleSetStep(activeStep - 1);
    }
  };

  handleForceStore = async () => {
    const { taskId } = propsToData(this.props);
    return waiter.run(taskId);
  };

  triggerExternalReader = ({ schema, changes, path }) => {
    if (!schema) return false;

    const { task, stepId } = propsToData(this.props);
    const { triggerExternalReader } = schema;

    if (!triggerExternalReader) return false;

    const checking = evaluate(
      triggerExternalReader,
      changes,
      task.document.data[stepId],
      task.document.data
    );

    if (checking === true) {
      this.setState({ triggerExternalPath: path });
      return true;
    }
    this.clearErrors();
    return false;
  };

  handleActionTriggers = async (dataPath, changes) => {
    const { actions } = this.props;

    const {
      taskId,
      task: {
        document: { data }
      },
      template: {
        jsonSchema: { calcTriggers }
      }
    } = propsToData(this.props);

    if (!calcTriggers || !calcTriggers.length) {
      return;
    }

    const actionTriggers = calcTriggers.filter(({ action }) => !!action);

    const parentPath = dataPath.slice(0, dataPath.length - 1);
    const parentData = objectPath.get(data, parentPath);

    const documentData = await handleActionTriggers(actionTriggers, {
      documentData: data,
      dataPath: dataPath.join('.'),
      value: changes,
      parentData,
      stepData: data[dataPath[0]],
      actions: { requestExternalData: actions.requestExternalData }
    });

    actions.setTaskDocumentValues(taskId, documentData);
  };

  setDefaultValueExecuted = (path) =>
    new Promise((resolve) => {
      const { actions } = this.props;
      const { taskId } = propsToData(this.props);

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

  getSavingInterval = (props) => {
    const {
      template: { taskTemplate }
    } = propsToData(this.props);

    try {
      const { changes, path, externalChecking } = props;

      const pathJoined = path.join('.');

      const getReassignTriggers = flatten(
        (taskTemplate?.setPermissions || [])
          .map(({ reassignTriggers }) => reassignTriggers)
          .filter(Boolean)
      ).map(({ source }) => source);

      const settingsExists = getReassignTriggers.includes(pathJoined);

      if (settingsExists) return STORE_VALUES_INTERVAL_MOMENT;

      const interval =
        (changes instanceof ChangeEvent && changes.force) || externalChecking
          ? STORE_VALUES_INTERVAL_FORCE
          : this.storeInterval;

      return interval;
    } catch (e) {
      return this.storeInterval;
    }
  };

  checkExternalReaderFiltersToChange = (path) => {
    const {
      stepId,
      template: {
        jsonSchema: { properties, calcTriggers }
      }
    } = propsToData(this.props);

    const stepSchema = properties[stepId] || {};

    const readers = Object.values(stepSchema)
      .filter((prop) => prop.control === 'externalReaderCheck')
      .map(({ filters }) => ({ ...filters }));

    if (!readers.length) return;

    const readerFiltersValues = readers.reduce((acc, reader) => {
      Object.keys(reader).forEach((key) => {
        acc[key] = reader[key];
      });
      return acc;
    });

    if (!Object.keys(readerFiltersValues).length) return;

    const triggers = (calcTriggers || [])
      .filter(({ source }) => source === path.join('.'))
      .map(({ target }) => target);

    const filterChanged = Object.values(readerFiltersValues).find(
      (filter = '') => (filter + '').includes(path.join('.')) || triggers.includes(filter)
    );

    if (filterChanged) {
      this.setState({ externalReaderErrors: [] });
    }
  };

  handleChange = async (...path) => {
    const { actions, setBusy, locked } = this.props;
    const { validationErrors, validationPageErrors } = this.state;

    const {
      taskId,
      task: { id, deleted, document, finished },
      template: { jsonSchema }
    } = propsToData(this.props);

    if (deleted || locked || finished || document.isFinal) return null;

    const changes = path.pop();
    const previousValue = objectPath.get(document.data, path);
    const externalChanges = changes instanceof ChangeEvent ? changes?.data : changes;

    if (this.ignoreEmptyValues && isEmpty(previousValue) && isEmpty(changes)) {
      return null;
    }

    const triggers = jsonSchema.calcTriggers || [];
    const pagePath = path.slice(1).join('.');
    const schema = objectPath.get(jsonSchema.properties, path.join('.properties.'));

    const busyOnload = changes instanceof ChangeEvent && changes.busyOnload;

    busyOnload && setBusy(true);

    this.setState({
      validationErrors: (validationErrors || []).filter(
        (error) => error.path !== pagePath || error.path !== ''
      ),
      validationPageErrors: (validationPageErrors || []).filter((error) => error.path !== '')
    });

    await actions.updateTaskDocumentValues(id, path, changes, triggers, schema);

    schema?.useHiddenTriggers && (await this.handleHiddenTriggers(path));

    waiter.addAction(
      taskId + '-action-triggers',
      () => {
        this.queue.push(w('action-triggers'), async () => this.handleActionTriggers(path, changes));
      },
      1000
    );

    const externalChecking = await this.triggerExternalReader({
      schema,
      changes: externalChanges,
      path
    });

    this.checkExternalReaderFiltersToChange(path);

    const readersToCall = schema && schema.externalReaderToCall;

    const interval = this.getSavingInterval({
      changes,
      path,
      externalChecking
    });

    const actionId =
      schema?.changeOnBlur && externalChecking ? taskId + '-external-checking' : taskId;

    return waiter.addAction(
      actionId,
      () => {
        this.queue.push(w('store'), async () =>
          this.storeHelper({ busyOnload, externalChecking, readersToCall })
        );
      },
      interval
    );
  };

  storeHelper = async ({ busyOnload, externalChecking, readersToCall, initSignersProps } = {}) => {
    const { actions, setBusy, locked, handleStore } = this.props;
    const {
      taskId,
      task: { deleted, document, finished }
    } = propsToData(this.props);

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

  handleImport = async (file) => {
    const { actions, handleStore } = this.props;
    const {
      taskId,
      task,
      template: {
        jsonSchema: { importSchema }
      }
    } = propsToData(this.props);

    try {
      const data = await parseTaskFromXLSX(file, importSchema);

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

  loadTaskAction = async () => {
    const { actions, setBusy } = this.props;
    const { taskId } = propsToData(this.props);

    setBusy(true);
    const task = await actions.loadTask(taskId);
    setBusy(false);
    return task;
  };

  setTaskDocumentValues = async (taskData, update = true, force) => {
    const { actions, handleStore, setBusy } = this.props;
    const { taskId } = propsToData(this.props);

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

  applyDocumentDiffs = async (diffs, path) => {
    const { actions } = this.props;

    if (!diffs || !diffs.length) {
      return;
    }

    const {
      taskId,
      template: {
        jsonSchema: { calcTriggers }
      }
    } = propsToData(this.props);

    this.queue.push(w('applyDocumentDiffs1'), async () =>
      actions.applyDocumentDiffs(taskId, diffs, path, {
        triggers: calcTriggers
      })
    );

    diffs.forEach((diffItem) =>
      this.queue.push(w('applyDocumentDiffs2'), async () =>
        this.handleActionTriggers(path.concat(diffItem.path), diffItem.lhs)
      )
    );

    return waiter.addAction(
      taskId,
      () => this.queue.push(w('applyDocumentDiffs3'), async () => this.storeHelper()),
      STORE_VALUES_INTERVAL
    );
  };

  downloadDocumentAttach = async (item, asics = false, p7s = false) => {
    const { actions } = this.props;
    return item.downloadToken
      ? actions.downloadFile(item, asics, p7s)
      : actions.downloadDocumentAttach(item, asics, p7s);
  };

  scrollToInvalidField = (errors) => {
    if (!errors) return;

    try {
      const firstError = deepObjectFind(errors, ({ path }) => !!path);

      if (!firstError) return;

      const replacepath = firstError?.path.replace(/\./g, '-');

      const firstInvalidField =
        document.getElementById(firstError?.path) ||
        document.getElementById(replacepath) ||
        document.querySelector(`input[name=${replacepath}]`) ||
        document.querySelector(`input[name=${replacepath.split('-').pop()}]`);

      if (!firstInvalidField) return;

      const type = firstInvalidField.getAttribute('type');
      const isHidden = type === 'hidden' || firstInvalidField.style.display === 'none';

      if (isHidden) {
        const parent = firstInvalidField.parentNode;
        parent && parent.scrollIntoView({ block: 'center' });
      } else {
        firstInvalidField.scrollIntoView({ block: 'center' });
      }
      setTimeout(() => {
        firstInvalidField.focus();
      }, 300);
    } catch {
      console.log('scrollToInvalidField errors', errors);
    }
  };

  scrollToTop = () => {
    const topPagePart =
      document.querySelector('#steper') ||
      document.querySelector('h1') ||
      document.querySelector('header');
    topPagePart && topPagePart.scrollIntoView();
  };

  onHandleTask = async () => {
    const { actions, setBusy, userInfo } = this.props;
    const { taskId } = propsToData(this.props);

    const result = await actions.loadTask(taskId);

    if (result?.meta?.handling?.userName) {
      actions.addError(new Error('HandlingUserExists'));
      return;
    }

    setBusy(true);
    await actions.setHandleTaskData(taskId, {
      userId: userInfo.userId,
      userName: userInfo.name,
      timestamp: new Date()
    });
    await actions.updateTaskAssign(taskId, [].concat(userInfo.userId));
    await actions.loadTask(taskId);
    setBusy(false);
  };

  onCancelHandlingTask = async () => {
    const { actions, setBusy } = this.props;
    const { taskId } = propsToData(this.props);

    setBusy(true);
    await actions.setHandleTaskData(taskId, {});
    await actions.updateTaskAssign(taskId, []);
    await actions.loadTask(taskId);
    setBusy(false);
  };

  render() {
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
      stepId,
      template: {
        jsonSchema: { greetingsPage, properties }
      }
    } = propsToData(this.props);

    const activeStep = this.getActiveStep();

    if ((activeStep === null && !greetingsPage) || initing) {
      return <Preloader flex={true} />;
    }

    const stepName = steps[activeStep];

    if (stepId === undefined && greetingsPage) {
      return <GreetingsPage {...greetingsPage} onDone={() => this.handleSetStep(0)} />;
    }

    if (!stepName || metaUpdating) {
      return <Preloader flex={true} />;
    }

    if (!properties[stepName]) {
      return <ErrorScreen error={new Error(t('StepNotConfigurated'))} />;
    }

    const pageErrorsConc = validationErrors.concat(validateErrorsProps);

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
              new Promise((resolve) => {
                this.queue.push(async () => resolve());
              }),
            loadTaskAction: this.loadTaskAction,
            forceReload: () =>
              new Promise((resolve) => {
                this.queue.push(async () => this.loadTaskAction());
                this.queue.push(async () => await awaitDelay(100));
                this.queue.push(async () => resolve());
              }),
            handleChange: this.handleChange,
            handleStore: () =>
              new Promise((resolve) => {
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
            addAction: (action) =>
              new Promise((resolve) => {
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
          setStoreEventError={(error) => this.setState({ storeEventError: error })}
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
        {captcha ? <Altcha ref={this.altchaRef} captcha={captcha} /> : null}
      </>
    );
  }
}

EditScreen.propTypes = {
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

EditScreen.defaultProps = {
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

const mapStateToProps = ({
  auth: { userUnits, info },
  files: { list: fileStorage },
  task: { steps, actual },
  externalReader
}) => ({
  fileStorage,
  userUnits,
  userInfo: info,
  taskSteps: steps,
  actual,
  captchaEnabled: externalReader?.captcha || {}
});

const mapDispatchToProps = (dispatch) => ({
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
    requestExternalData: (requestData) =>
      api.post('external_reader', requestData, 'REQUEST_EXTERNAL_DATA', dispatch),
    validateDocument: bindActionCreators(validateDocument, dispatch),
    setTaskMeta: bindActionCreators(setTaskMeta, dispatch),
    getExternalReaderCaptcha: bindActionCreators(getExternalReaderCaptcha, dispatch)
  }
});

const translated = translate('TaskPage')(EditScreen);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
