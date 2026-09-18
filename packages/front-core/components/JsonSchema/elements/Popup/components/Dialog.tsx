/* eslint-disable no-restricted-globals */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-template-curly-in-string */

import React from 'react';
import cleanDeep from 'clean-deep';
import { translate } from 'react-translate';
import objectPath from 'object-path';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import ExtReaderMessages from 'modules/tasks/pages/Task/screens/EditScreen/components/ExtReaderMessages';

import diff from 'helpers/diff';
import evaluate from 'helpers/evaluate';
import waiter from 'helpers/waitForAction';
import asyncFilter from 'helpers/asyncFilter';
import renderHTML from 'helpers/renderHTML';
import awaitDelay from 'helpers/awaitDelay';

import { setPopupData } from 'actions/debugTools';
import * as taskActions from 'application/actions/task';
import { externalReaderCheckData } from 'application/actions/task';

import {
  Button,
  Dialog,
  DialogTitle,
  DialogActions,
  FormControl,
  Typography,
  DialogContent,
  IconButton,
} from '@mui/material';

import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';

import {
  SchemaForm,
  handleChangeAdapter,
  validateData,
  handleActionTriggers,
  handleTriggers,
} from 'components/JsonSchema';

import ProgressLine from 'components/Preloader/ProgressLine';
import AltchaUntyped from 'components/Altcha';
import { ReactComponent as CloseIcon } from 'assets/img/ic_close_big.svg';

import addParent from 'helpers/addParentField';
import queueFactory from 'helpers/queueFactory';

import * as api from 'services/api';

const Altcha = AltchaUntyped as unknown as React.ComponentType<Record<string, unknown>>;

// getExternalReaderCaptcha is only exported by cabinet-front's application/actions/task;
// admin-front's copy lacks it, so it is resolved dynamically to keep this file shared between both apps.
const getExternalReaderCaptcha = (taskActions as unknown as Record<string, (...args: unknown[]) => (dispatch: Dispatch) => Promise<unknown>>).getExternalReaderCaptcha;

const STORE_VALUES_INTERVAL = 2000;

const styles = (theme: Theme) => ({
  contentRoot: {
    overflowY: 'visible' as const,
    [theme.breakpoints.down('md')]: {
      paddingLeft: 16,
      paddingRight: 16,
    },
  },
  paperWidthSm: {
    padding: 56,
    paddingBottom: 80,
    maxWidth: 800,
    minWidth: 800,
    maxHeight: 'unset',
    [theme.breakpoints.down('lg')]: {
      padding: 5,
      margin: '40px auto!important',
      width: '95%',
      maxWidth: 'unset',
      minWidth: 'unset',
      paddingTop: 35,
    },
  },
  paperScrollBody: {
    [theme.breakpoints.down('md')]: {
      maxWidth: 'calc(100% - 32px)!important',
      paddingLeft: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingTop: 40,
    },
  },
  dialogActions: {
    justifyContent: 'start',
    marginTop: 20,
    paddingLeft: 24,
    margin: 0,
    alignItems: 'normal',
    [theme.breakpoints.down('lg')]: {
      marginBottom: 20,
    },
    [theme.breakpoints.down('md')]: {
      marginBottom: 16,
      padding: 0,
      paddingLeft: 16,
    },
  },
  closeIcon: {
    position: 'absolute' as const,
    top: 42,
    right: 42,
    fontSize: 50,
    padding: 6,
    minWidth: 40,
    [theme.breakpoints.down('lg')]: {
      top: 7,
      right: 10,
    },
  },
  closeIconImg: {
    width: 37,
    height: 37,
    [theme.breakpoints.down('lg')]: {
      width: 25,
      height: 25,
    },
  },
  actionButton: {
    margin: 0,
    marginRight: 15,
    '&:focus-visible': {
      outline: '3px solid #0073E6'
    }
  },
  treeSelectData: {
    display: 'inline-block',
    padding: '10px 17px',
    borderRadius: 50,
    backgroundColor: '#F1F1F1',
    marginBottom: 15,
  },
  dialogTitleRoot: {
    marginBottom: 20,
    paddingRight: 80,
    fontSize: '2.125rem',
    lineHeight: '1.17',
    [theme.breakpoints.down('lg')]: {
      padding: 0,
      margin: 0,
      paddingLeft: 24,
      fontSize: 26,
    },
    [theme.breakpoints.down('md')]: {
      paddingLeft: 16,
      paddingRight: 16,
    },
  },
  dialogDescRoot: {
    [theme.breakpoints.down('md')]: {
      paddingLeft: 16,
      paddingRight: 16,
      paddingBottom: 2,
      fontSize: 14,
    },
  },
  btnPadding: {
    padding: '14px 36px',
  },
  poper: {
    fontSize: 16,
    marginBottom: 20,
    marginTop: 20,
    padding: 16,
    maxWidth: 640,
    background: 'rgb(255, 244, 215)',
  },
  noHoverBtn: {
    marginRight: 15,
    padding: '6px 8px',
    borderRadius: 4,
  },
  focusVisible: {
    outline: '3px solid #0073E6'
  }
});

const cutTrash = (path: string) => {
  path = path.replace(/.properties/g, '');
  path = path.replace(/.items/g, '');
  path = path.replace(/\${index}/g, '');
  return path;
};

interface ExternalReaderControl {
  service: string;
  method: string;
  path: string;
  isChecking?: string;
  checkValid?: Array<{ isValid: string; errorText: string }>;
  serviceErrorMessage?: string;
  errorPath?: string;
  ignoreError?: string;
  control?: string;
  pendingMessage?: string;
  [key: string]: unknown;
}

interface DialogWrapperProps extends WithStyles<typeof styles> {
  t: (key: string) => string;
  properties: Record<string, unknown>;
  originDocument: { id?: string | number; data: Record<string, unknown> };
  schema: {
    properties?: Record<string, unknown>;
    required?: unknown;
    finishScreenText?: string;
    triggersOnDelete?: unknown[];
    [key: string]: unknown;
  };
  stepName: string;
  readOnly?: boolean;
  description?: string | null;
  dialogTitle?: string | null;
  path: Array<string | number>;
  steps?: string[];
  taskId?: string | null;
  rootDocument: { id?: string | number; data: Record<string, unknown> } | null;
  rootValue?: Record<string, unknown>;
  activeStep?: number | null;
  handleClose: (disableSaveAction?: boolean) => void;
  saveText?: string | null;
  actions: {
    setValues: (data: unknown, ...rest: unknown[]) => unknown;
    handleStore: () => Promise<unknown>;
    forceReload: () => Promise<unknown>;
    scrollToInvalidField: (errors: unknown) => void;
  };
  popupActions: {
    setPopupData: (data: unknown) => void;
    externalReaderCheckData: (...args: unknown[]) => Promise<unknown>;
    requestExternalData: (requestData: unknown) => Promise<unknown>;
    getExternalReaderCaptcha: (service: string, method: string) => Promise<unknown>;
  };
  open?: boolean;
  template: { jsonSchema: { properties?: Record<string, unknown>; calcTriggers?: unknown[] } };
  pathIndex?: { index?: number } | null;
  saveLocalDataOnInit?: boolean;
  active?: boolean;
  disableForceSave?: boolean;
  task?: unknown;
  locked?: boolean;
  fullScreen?: boolean;
  fileStorage?: unknown;
  useOwnData?: boolean;
  finishScreenText?: string;
  parentValue?: Record<string, unknown>;
  name?: string;
  captchaEnabled?: { isEnabledFor?: string[] };
  deleteItemAction: () => Promise<unknown>;
  [key: string]: unknown;
}

interface DialogWrapperState {
  rootDocument: { id?: string | number; data: Record<string, unknown> };
  errors: Array<{ path: string; [key: string]: unknown }>;
  externalMessage: unknown[];
  externalPending: unknown[];
  loading: boolean;
  closing: boolean;
  triggerExternalPath: false | Array<string | number>;
  forceSaving: boolean;
  finished: boolean;
  captcha?: { challenge?: unknown } | null;
  ariaText?: string;
}

class DialogWrapper extends React.Component<DialogWrapperProps, DialogWrapperState> {
  static defaultProps = {
    description: null,
    dialogTitle: null,
    readOnly: false,
    path: null,
    steps: [],
    taskId: null,
    rootDocument: null,
    activeStep: null,
    saveText: null,
    actions: {},
    popupActions: {},
    open: false,
    pathIndex: null,
    saveLocalDataOnInit: false,
    active: true,
    disableForceSave: false,
  };

  altchaRef: React.RefObject<{ value?: unknown } | null>;

  finishRef: React.RefObject<HTMLElement | null>;

  queue: ReturnType<typeof queueFactory.get>;

  constructor(props: DialogWrapperProps) {
    super(props);
    const { rootDocument, rootValue, taskId, disableForceSave } = this.props;

    this.state = {
      rootDocument: (rootValue ? { data: rootValue } : rootDocument) as { id?: string | number; data: Record<string, unknown> },
      errors: [],
      externalMessage: [],
      externalPending: [],
      loading: false,
      closing: false,
      triggerExternalPath: false,
      forceSaving: !disableForceSave,
      finished: false,
    };

    this.altchaRef = React.createRef();
    this.finishRef = React.createRef();

    this.queue = queueFactory.get(taskId as string);
  }

  componentDidUpdate = (prevProps: DialogWrapperProps) => {
    const { rootDocument, saveLocalDataOnInit, taskId } = this.props;

    if (!prevProps.finished && this.state.finished && this.finishRef.current) {
      this.finishRef.current.focus();
    }

    if (saveLocalDataOnInit) return;

    const diffs = diff(prevProps.rootDocument, rootDocument);

    if (taskId && diffs) {
      this.setState({ rootDocument: rootDocument as { id?: string | number; data: Record<string, unknown> } });
    }
  };

  componentDidMount = () =>
    this.updateDebugInfo({
      opening: true,
    });

  componentWillUnmount = () => {
    const { popupActions } = this.props;
    const { forceSaving } = this.state;
    if (forceSaving) return;
    popupActions.setPopupData(null);
  };

  updateDebugInfo = async (props?: { opening?: boolean; onClose?: boolean; indexPath?: unknown }) => {
    const { popupActions, schema } = this.props;
    const { forceSaving } = this.state;

    this.handlePopupTriggers(props);

    if (forceSaving) return;

    popupActions.setPopupData({
      ...this.state,
      ...this.getPopupProps(),
      data: this.getData(),
      schema,
    });
  };

  handleChangeWrapper = (...args: unknown[]) => {
    const queue = queueFactory.get(this.getPath().concat('popup').join());
    queue.push(async () => this.handleChange(args) as never);
  };

  handleChange = (args: unknown[]) =>
    new Promise<void>((resolve) => {
      (async () => {
        const { template, actions, taskId } = this.props;
        const { rootDocument, closing, forceSaving } = this.state;

        (handleChangeAdapter(
          rootDocument.data,
          async (data: unknown, { dataPath, changes }: { dataPath: string; changes: unknown }) => {
            const newRootDocument = { ...rootDocument };

            if (closing) return resolve();
            const oldValue = objectPath.get(newRootDocument.data, dataPath);

            if (oldValue === changes) {
              return resolve();
            }
            const isDeleting =
              changes === null ||
              (typeof changes === 'object' && Object.keys(changes || {}).length === 0);

            if (isDeleting) {
              addParent(dataPath, newRootDocument);

              const cleanWhenHidden = this.getControlCleanWhenHidden(args);

              if (!oldValue && !cleanWhenHidden) {
                return resolve();
              }

              objectPath.del(newRootDocument.data, dataPath);
            } else {
              newRootDocument.data = data as Record<string, unknown>;
            }

            newRootDocument.data = (await this.handleActionTriggers(
              dataPath,
              changes,
              newRootDocument.data,
            )) as Record<string, unknown>;

            if (!diff(rootDocument, newRootDocument)) {
              return resolve();
            }

            this.setState({ rootDocument: newRootDocument }, async () => {
              await this.updateDebugInfo();

              if (forceSaving) {
                waiter.addAction(
                  taskId as string,
                  () => {
                    actions.setValues(
                      this.removeEmptyFields(newRootDocument.data),
                      true,
                      (changes as { force?: unknown })?.force,
                    );
                  },
                  STORE_VALUES_INTERVAL,
                );

                this.triggerExternalReader(args);
              }

              return resolve();
            });

            return resolve();
          },
          false,
          template.jsonSchema as never,
        ) as unknown as (...bindArgs: unknown[]) => (...callArgs: unknown[]) => unknown).bind(
          null,
          ...this.getPath(),
        )(...args);
      })();
    });

  handlePopupTriggers = async (props?: { opening?: boolean; onClose?: boolean; indexPath?: unknown }) => {
    const {
      rootDocument: rootDocumentProp,
      pathIndex,
      parentValue,
      stepName,
      actions,
      path,
      schema: { triggersOnDelete = [] },
      template: {
        jsonSchema: { calcTriggers = [] },
      },
    } = this.props;

    const onClose = props?.onClose;
    const indexPath = props?.indexPath || path;
    const opening = props?.opening;
    const rootDocument = rootDocumentProp as { id?: string | number; data: Record<string, unknown> };

    const newValue = objectPath.get(rootDocument.data, this.getPath());

    if (!calcTriggers.length) return;

    const popupTriggers = ((onClose ? triggersOnDelete : calcTriggers) as Array<{ source: unknown; openPopup?: boolean }>).filter(
      ({ source, openPopup }) => {
        const exists = ([] as unknown[])
          .concat(source as never)
          .filter(Boolean)
          .filter((item) => {
            let indexCount = 0;

            const sourcePath =
              openPopup && opening
                ? (item as string).replace(/\$\{.+?}/g, () => {
                    while (
                      indexCount < path.length &&
                      typeof path[indexCount] !== 'number'
                    ) {
                      indexCount++;
                    }

                    return indexCount < path.length ? String(path[indexCount++]) : '';
                  })
                : (item as string).replace(/\$\{.+?}/, String(pathIndex?.index));

            return sourcePath === this.getPath().join('.');
          });
        return exists.length;
      },
    );

    if (!popupTriggers.length) return;

    const newData = await (handleTriggers as unknown as (...args: unknown[]) => Record<string, unknown>)(
      rootDocument.data,
      popupTriggers,
      this.getPath().join('.'),
      newValue,
      rootDocument.data[stepName],
      rootDocument.data,
      parentValue,
      null,
      null,
      null,
      indexPath,
    );

    actions.setValues(this.removeEmptyFields(newData as Record<string, unknown>));
  };

  handleActionTriggers = async (path: string, changes: unknown, data: Record<string, unknown>) => {
    const {
      popupActions,
      template: {
        jsonSchema: { calcTriggers = [] },
      },
    } = this.props;

    if (!calcTriggers.length) {
      return data;
    }

    const dataPath = path.split('.');
    const actionTriggers = (calcTriggers as Array<{ action?: unknown }>).filter(({ action }) => !!action);

    const parentPath = dataPath.slice(0, dataPath.length - 1);
    const parentData = objectPath.get(data, parentPath);

    const documentData = await handleActionTriggers(actionTriggers as never, {
      documentData: data,
      dataPath: dataPath.join('.'),
      value: changes,
      parentData,
      stepData: data[dataPath[0]],
      actions: { requestExternalData: popupActions.requestExternalData },
    } as never);

    return documentData;
  };

  getControlCleanWhenHidden = (args: unknown[]) => {
    const { schema } = this.props;

    const newArgs = [...args];

    newArgs.pop();

    const controlSchema = objectPath.get(
      schema.properties,
      newArgs.join('.properties.'),
    ) as { cleanWhenHidden?: unknown } | undefined;

    return controlSchema?.cleanWhenHidden;
  };

  getPopupProps = () => {
    const { rootDocument } = this.state;
    const { schema, stepName, template, rootValue } = this.props;

    let pageSchema: Record<string, unknown> = schema;

    if (template && template.jsonSchema && !rootValue && stepName) {
      const {
        jsonSchema: { properties },
      } = template;
      pageSchema = (properties || {})[stepName] as Record<string, unknown>;
    }

    const rootPath = [stepName].filter(Boolean);

    const pageData = objectPath.get(rootDocument.data, rootPath);
    return { pageSchema, pageData };
  };

  removeEmptyFields = (object: Record<string, unknown> = {}) => {
    const recursiveObj = (obj: Record<string, unknown>): Record<string, unknown> => {
      (Object.keys(obj) || []).forEach((key) => {
        if (obj[key] === null) delete obj[key];
        if (typeof obj[key] === 'object') recursiveObj(obj[key] as Record<string, unknown>);
      });
      return obj;
    };
    return recursiveObj(object);
  };

  deleteItem = async () => {
    const { deleteItemAction, handleClose } = this.props;

    this.setState({
      loading: true,
      closing: true,
      externalMessage: [],
      externalPending: [],
    });

    await deleteItemAction();

    await this.handlePopupTriggers({
      onClose: true,
    });

    handleClose(true);

    this.setState({
      loading: false,
      closing: false,
    });
  };

  handleClose = async () => {
    const { handleClose } = this.props;
    handleClose();
  };

  getExternalPath = (path: string) => {
    const { pathIndex, path: pathOrigin } = this.props;

    if (pathIndex) {
      const pathIndexes = pathOrigin.filter((item) => !isNaN(item as number));

      const replacedPath = pathIndexes.reduce((acc: string, item) => {
        return acc.replace('${index}', String(item));
      }, path);

      return cutTrash(replacedPath);
    }

    return cutTrash(path);
  };

  triggerExternalReader = async (args: unknown[]) => {
    const { rootDocument: rootDocumentProp, schema, stepName, taskId, path } = this.props;
    const rootDocument = rootDocumentProp as { id?: string | number; data: Record<string, unknown> };

    if (!schema) return false;

    const changes = args.pop();

    const controlSchema = objectPath.get(
      schema.properties,
      args.join('.').replace(/\.\d+\./, '.items.properties.'),
    ) as { triggerExternalReader?: string; messagingOnStep?: boolean } | undefined;
    const indexPath = args.filter((item) => !isNaN(item as number));

    if (!controlSchema) return false;

    const { triggerExternalReader, messagingOnStep } = controlSchema;

    if (!triggerExternalReader) return false;

    const externalChecking = evaluate(
      triggerExternalReader,
      changes,
      rootDocument.data[stepName],
      rootDocument.data,
    );

    if (externalChecking instanceof Error) return false;

    const asyncCheck = this.getExternalReaders();

    if (externalChecking && asyncCheck.length) {
      if (!messagingOnStep) {
        this.setState({
          triggerExternalPath: ([stepName] as Array<string | number>).concat(path).concat(args as Array<string | number>),
        });
      }
      await waiter.run(taskId as string);
      await this.handleExternalReadersCall(asyncCheck, true, indexPath);
      await this.handlePopupTriggers({
        indexPath,
      } as never);
    }

    return true;
  };

  setExternalErrorMessage = (result: unknown, serviceErrorMessage?: string) => {
    if (!serviceErrorMessage) return;
    const { externalMessage } = this.state;

    let evaluatedErrorMessage: unknown = evaluate(serviceErrorMessage, result);

    if (evaluatedErrorMessage instanceof Error) {
      evaluatedErrorMessage = serviceErrorMessage;
    }

    if (externalMessage.length) {
      this.setState({
        externalMessage: externalMessage.concat(evaluatedErrorMessage as never),
      });
    } else {
      this.setState({
        externalMessage: [evaluatedErrorMessage],
      });
    }
  };

  externalReaderCheckActions = async (asyncCheck: ExternalReaderControl[], trigger?: boolean, indexPath?: unknown) => {
    const {
      t,
      stepName,
      rootDocument: rootDocumentProp,
      popupActions,
      pathIndex,
      actions,
      parentValue = {},
      name,
      path: pathOrigin,
      captchaEnabled,
    } = this.props;
    const rootDocument = rootDocumentProp as { id?: string | number; data: Record<string, unknown> };
    const checkIsChecking = (asyncCheck || []).map(
      ({ isChecking }) => isChecking,
    );

    const isCheckingArray = (checkIsChecking || []).map((isCheckingFunc) => {
      const { path } = this.props;
      const documentData = (rootDocument && rootDocument.data) || {};
      const concatPath = ([stepName] as Array<string | number>).concat(path).join('.');
      const checking = evaluate(
        isCheckingFunc as string,
        objectPath.get(documentData, concatPath),
        documentData[stepName],
        documentData,
      );
      if (checking === false) return false;
      if (!trigger && isCheckingFunc === undefined) return false;
      return true;
    });

    if (
      isCheckingArray.filter((el) => el === false).length === asyncCheck.length
    ) {
      return;
    }

    const externalPending = (asyncCheck || [])
      .map(({ pendingMessage }) => pendingMessage)
      .filter((e, i) => isCheckingArray[i] === true);

    this.setState({ externalPending });

    await asyncFilter(asyncCheck, async (control) => {
      const {
        service,
        method,
        path,
        checkValid,
        serviceErrorMessage = t('externalReaderError'),
        errorPath,
      } = control;

      const controlIndex = asyncCheck?.findIndex((item) => item?.path === path);

      if (isCheckingArray[controlIndex] === false) return;

      const body: Record<string, unknown> = {
        service,
        method,
        path,
      };

      if (pathIndex) {
        body.index = pathOrigin
          .filter((item) => !isNaN(item as number))
          .concat((indexPath as Array<string | number>) || []);
      }

      const enabled = (captchaEnabled?.isEnabledFor || []).includes(`${service}.${method}`);

      const captcha = !enabled ? null : await popupActions.getExternalReaderCaptcha(
        service,
        method,
      );

      if ((captcha as { challenge?: unknown })?.challenge) {
        this.setState({ captcha: captcha as { challenge?: unknown } });

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

      const result = await popupActions.externalReaderCheckData(
        rootDocument.id,
        body,
      );

      const isIgnoreErrorsFunc = asyncCheck.find(
        (item) => item.path === path,
      )?.ignoreError;
      let ignore;
      if (isIgnoreErrorsFunc) {
        const documentData = (rootDocument && rootDocument.data) || {};
        const concatPath = ([stepName] as Array<string | number>).concat(path).join('.');
        ignore = evaluate(
          isIgnoreErrorsFunc,
          (result as { data?: unknown })?.data || result || {},
          objectPath.get(documentData, concatPath),
          documentData[stepName],
          documentData,
        );
        if (ignore instanceof Error) ignore = false;
      }

      const updateDocumentErrorPath = async (value: unknown) => {
        const { rootDocument } = this.state;
        const newData = { ...rootDocument };
        let errorPathInDocument = errorPath;

        if (pathIndex) {
          const pathIndexes = pathOrigin.filter((item) => !isNaN(item as number));
          errorPathInDocument = pathIndexes.reduce((acc: string, item) => acc.replace('${index}', String(item)), errorPath as string);
          errorPathInDocument = cutTrash(errorPathInDocument);
        }

        objectPath.set(newData.data, errorPathInDocument as string, value);
        await actions.setValues(newData.data, false);
      };

      const sanitizeTraceId = (message: unknown) => {
        const regex = /"traceId":"([^"]+)"/;
        return `${message}`.replace(regex, '"traceId":""');
      };

      if (result instanceof Error) {
        if (!ignore) {
          this.setExternalErrorMessage(result, serviceErrorMessage);
        }

        if (errorPath) {
          const newErrorMessage = sanitizeTraceId(result);
          const prevErrorMessage = sanitizeTraceId((objectPath.get(this.state.rootDocument.data, errorPath) as { error?: string })?.error || '');

          if (prevErrorMessage !== newErrorMessage) {
            await updateDocumentErrorPath({ error: `${result}` });
          }
        }
      } else {
        const resultData = (result as { data: Record<string, unknown> }).data;
        const errors = (checkValid || [])
          .map(({ isValid, errorText }) => {
            const replacedPath = this.getExternalPath(path);
            const resultValue = objectPath.get(resultData, replacedPath);
            const res = evaluate(isValid, resultValue, resultData[stepName] || {}, resultData || {}, (parentValue as Record<string, unknown>)[name as string] || {});
            if (res instanceof Error) return null;
            if (res === false) {
              const errorTextEvaluated = evaluate(errorText, resultData[stepName] || {}, resultData || {}, resultValue);
              return renderHTML((errorTextEvaluated instanceof Error ? errorText : errorTextEvaluated) as string);
            }
            return null;
          })
          .filter(Boolean);

        if (errors.length) {
          this.setState({ externalMessage: this.state.externalMessage.concat(errors as never) });
        }

        await actions.forceReload();

        if (errorPath) {
          await updateDocumentErrorPath(undefined);
        }
      }
    });
  };

  getExternalReaders = (): ExternalReaderControl[] =>
    (Object.values(this.props || {}) || []).filter(Boolean).filter((prop) => {
      if (typeof prop === 'object' && (prop as { control?: string }).control === 'externalReaderCheck') {
        return true;
      }

      return false;
    }) as unknown as ExternalReaderControl[];

  handleExternalReadersCall = async (asyncCheck: ExternalReaderControl[], trigger?: boolean, indexPath?: unknown) => {
    const { actions } = this.props;

    this.setState({
      loading: true,
      externalMessage: [],
    });

    await actions.handleStore();

    await this.externalReaderCheckActions(asyncCheck, trigger, indexPath);

    this.setState({ loading: false });
  };

  handleSave = async () => {
    const { rootDocument, forceSaving } = this.state;
    const { taskId, actions, handleClose, path } = this.props;
    const { pageSchema, pageData } = this.getPopupProps();

    const asyncCheck = this.getExternalReaders();

    const rootDocumentData = cleanDeep(rootDocument.data, {
      emptyArrays: false,
      emptyObjects: false,
      emptyStrings: false,
    });

    const value = this.getData();

    let errors = (validateData as unknown as (...args: unknown[]) => Array<{ path: string; [key: string]: unknown }>)(
      this.removeEmptyFields(pageData as Record<string, unknown>),
      pageSchema,
      rootDocumentData,
      value,
      true,
    );

    errors = errors.filter(
      ({ path: errorPath }) => errorPath.indexOf(path.join('.')) === 0,
    );

    if (errors && errors.length) {
      console.log('popup.validation.errors', errors);
    }

    this.setState({ errors });

    if (errors && errors.length) {
      actions.scrollToInvalidField(errors);
      return;
    }

    this.setState({ loading: true });

    if (forceSaving) {
      await waiter.run(taskId as string);
    } else {
      const result = await actions.setValues(rootDocumentData, false);
      if (result) {
        this.setState({ errors: result as never, loading: false });
        return;
      }
    }

    if (asyncCheck.length) {
      await this.handleExternalReadersCall(asyncCheck);
      await awaitDelay(100);

      const { externalMessage } = this.state;

      if (externalMessage.length) return;
    }

    this.setState({ loading: false, finished: !!this.props.finishScreenText });

    if (!this.props.finishScreenText) {
      handleClose();
    }
  };

  getData = () => {
    const { rootDocument } = this.state;
    return objectPath.get(rootDocument.data, this.getPath());
  };

  getOriginData = () => {
    const { originDocument } = this.props;
    return objectPath.get(originDocument.data, this.getPath());
  };

  getPath = () => {
    const { stepName, path } = this.props;
    return ([stepName] as Array<string | number | null | undefined>)
      .concat(path)
      .filter((p) => p !== null && p !== undefined && p !== '') as Array<string | number>;
  };

  render = () => {
    const {
      t,
      classes,
      actions,
      properties,
      dialogTitle,
      description,
      template,
      readOnly,
      path,
      pathIndex,
      steps,
      open,
      task,
      taskId,
      originDocument,
      stepName,
      schema,
      locked,
      activeStep,
      saveText,
      fullScreen,
      fileStorage,
      active,
      useOwnData,
    } = this.props;

    const {
      rootDocument,
      errors,
      loading,
      externalMessage,
      externalPending,
      triggerExternalPath,
      forceSaving,
      captcha,
      finished,
      ariaText
    } = this.state;

    const value = this.getData();

    return (
      <>
        <Dialog
          open={open as boolean}
          onClose={(event, reason) => {
            if (reason === 'backdropClick') {
              return false;
            }

            return this.handleClose();
          }}
          scroll="body"
          fullScreen={fullScreen}
          classes={{
            root: (classes as Record<string, string>).dialogRoot,
            paperWidthSm: classes.paperWidthSm,
            paperScrollBody: classes.paperScrollBody,
          }}
          aria-label={ariaText}
          aria-labelledby=""
        >
          <IconButton
            onClick={this.handleClose}
            className={classes.closeIcon}
            aria-label={t('CloseModal')}
          >
            <CloseIcon className={classes.closeIconImg} />
          </IconButton>
          {dialogTitle && !finished ? (
            <DialogTitle tabIndex={0} classes={{ root: classes.dialogTitleRoot }}>
              {dialogTitle}
            </DialogTitle>
          ) : null}
          {description && !finished ? (
            <DialogTitle tabIndex={0} classes={{ root: classes.dialogDescRoot }}>
              {description}
            </DialogTitle>
          ) : null}
          <DialogContent classes={{ root: classes.contentRoot }}>
          {finished && schema.finishScreenText ? (
            <Typography
              tabIndex={0}
              ref={this.finishRef as never}
              style={{marginTop: 15}}
            >
              {schema.finishScreenText}
            </Typography>
          ) : (
            <>
            <SchemaForm
              steps={steps}
              locked={locked}
              task={task}
              taskId={taskId}
              actions={actions}
              activeStep={activeStep}
              fileStorage={fileStorage}
              documents={{ rootDocument, originDocument }}
              rootDocument={{ data: value || {}, id: rootDocument.id }}
              originDocument={{
                data: this.getOriginData() || {},
                id: originDocument.id,
              }}
              documentValue={rootDocument}
              template={template}
              stepName={stepName}
              errors={errors}
              schema={{ type: 'object', properties }}
              isPopup={true}
              useOwnData={useOwnData}
              path={path}
              pathIndex={pathIndex}
              readOnly={readOnly || loading}
              value={value || {}}
              parentValue={value || {}}
              parentSchema={schema}
              onChange={this.handleChangeWrapper}
              required={schema.required}
              triggerExternalPath={triggerExternalPath}
              forceSaving={forceSaving}
              externalReaderMessage={
                <ExtReaderMessages
                  busy={loading}
                  inControl={true}
                  pendingMessage={externalPending}
                  externalReaderErrors={externalMessage}
                />
              }
            />

            {!triggerExternalPath ? (
              <>
                {loading && externalPending.length ? (
                  <div className={classes.poper}>
                    {externalPending.map((mss, index) => (
                      <Typography key={index}>{mss as React.ReactNode}</Typography>
                    ))}
                  </div>
                ) : null}
                {!loading && externalMessage.length ? (
                  <FormControl className={(classes as Record<string, string>).root}>
                    <div className={classes.poper}>
                      {externalMessage.map((mss, index) => (
                        <Typography key={index}>{mss as React.ReactNode}</Typography>
                      ))}
                    </div>
                  </FormControl>
                ) : null}
              </>
            ) : null}

            <ProgressLine loading={loading || !active} />
            </>
          )}
          </DialogContent>
          {!readOnly && !finished ? (
            <DialogActions classes={{ root: classes.dialogActions }}>
              <Button
                onClick={this.handleSave}
                color="primary"
                variant="contained"
                disabled={loading}
                className={classes.actionButton}
                classes={{
                  label: (classes as Record<string, string>).btnpadding,
                } as Record<string, string>}
                aria-label={saveText || t('Edit')}
              >
                {saveText || t('Edit')}
              </Button>
            </DialogActions>
          ) : null}
        </Dialog>
        {captcha ? <Altcha ref={this.altchaRef as never} captcha={captcha} /> : null}
      </>
    );
  };
}

const mapStateToProps = ({
  externalReader
}: { externalReader?: { captcha?: { isEnabledFor?: string[] } } }) => ({
  captchaEnabled: externalReader?.captcha || {}
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  popupActions: {
    setPopupData: bindActionCreators(setPopupData as never, dispatch as never),
    externalReaderCheckData: bindActionCreators(
      externalReaderCheckData as never,
      dispatch as never,
    ),
    requestExternalData: (requestData: unknown) =>
      api.post(
        'external_reader',
        requestData,
        'REQUEST_EXTERNAL_DATA',
        dispatch as never,
      ),
    getExternalReaderCaptcha: bindActionCreators(
      getExternalReaderCaptcha as never,
      dispatch as never,
    ),
  },
});

const styled = withStyles(styles)(DialogWrapper);
const translated = translate('Elements')(styled as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never);
