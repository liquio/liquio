/* eslint-disable no-restricted-globals */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-template-curly-in-string */

import React from 'react';
import cleanDeep from 'clean-deep';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import objectPath from 'object-path';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import ExtReaderMessages from 'modules/tasks/pages/Task/screens/EditScreen/components/ExtReaderMessages';

import diff from 'helpers/diff';
import evaluate from 'helpers/evaluate';
import waiter from 'helpers/waitForAction';
import asyncFilter from 'helpers/asyncFilter';
import renderHTML from 'helpers/renderHTML';
import awaitDelay from 'helpers/awaitDelay';

import { setPopupData } from 'actions/debugTools';
import {
  externalReaderCheckData,
  getExternalReaderCaptcha,
} from 'application/actions/task';

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

import withStyles from '@mui/styles/withStyles';

import {
  SchemaForm,
  handleChangeAdapter,
  validateData,
  handleActionTriggers,
  handleTriggers,
} from 'components/JsonSchema';

import ProgressLine from 'components/Preloader/ProgressLine';
import Altcha from 'components/Altcha';
import { ReactComponent as CloseIcon } from 'assets/img/ic_close_big.svg';

import addParent from 'helpers/addParentField';
import queueFactory from 'helpers/queueFactory';

import * as api from 'services/api';

const STORE_VALUES_INTERVAL = 2000;

const styles = (theme) => ({
  contentRoot: {
    overflowY: 'visible',
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
    position: 'absolute',
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

const cutTrash = (path) => {
  path = path.replace(/.properties/g, '');
  path = path.replace(/.items/g, '');
  path = path.replace(/\${index}/g, '');
  return path;
};

class DialogWrapper extends React.Component {
  constructor(props) {
    super(props);
    const { rootDocument, rootValue, taskId, disableForceSave } = this.props;

    this.state = {
      rootDocument: rootValue ? { data: rootValue } : rootDocument,
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

    this.queue = queueFactory.get(taskId);
  }

  componentDidUpdate = (prevProps) => {
    const { rootDocument, saveLocalDataOnInit, taskId } = this.props;

    if (!prevProps.finished && this.state.finished && this.finishRef.current) {
      this.finishRef.current.focus();
    }

    if (saveLocalDataOnInit) return;

    const diffs = diff(prevProps.rootDocument, rootDocument);

    if (taskId && diffs) {
      this.setState({ rootDocument });
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

  updateDebugInfo = async (props) => {
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

  handleChangeWrapper = (...args) => {
    const queue = queueFactory.get(this.getPath().concat('popup').join());
    queue.push(async () => this.handleChange(args));
  };

  handleChange = (args) =>
    new Promise(async (resolve) => {
      const { template, actions, taskId } = this.props;
      const { rootDocument, closing, forceSaving } = this.state;

      handleChangeAdapter(
        rootDocument.data,
        async (data, { dataPath, changes }) => {
          const newRootDocument = { ...rootDocument };

          if (closing) return resolve();
          const oldValue = objectPath.get(newRootDocument.data, dataPath);

          if (oldValue === changes) {
            return resolve();
          }
          const isDeleting =
            changes === null ||
            (typeof changes === 'object' && Object.keys(changes).length === 0);

          if (isDeleting) {
            addParent(dataPath, newRootDocument);

            const cleanWhenHidden = this.getControlCleanWhenHidden(args);

            if (!oldValue && !cleanWhenHidden) {
              return resolve();
            }

            objectPath.del(newRootDocument.data, dataPath);
          } else {
            newRootDocument.data = data;
          }

          newRootDocument.data = await this.handleActionTriggers(
            dataPath,
            changes,
            newRootDocument.data,
          );

          if (!diff(rootDocument, newRootDocument)) {
            return resolve();
          }

          this.setState({ rootDocument: newRootDocument }, async () => {
            await this.updateDebugInfo();

            if (forceSaving) {
              waiter.addAction(
                taskId,
                () => {
                  actions.setValues(
                    this.removeEmptyFields(newRootDocument.data),
                    true,
                    changes?.force,
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
        template.jsonSchema,
      ).bind(
        null,
        ...this.getPath(),
      )(...args);
    });

  handlePopupTriggers = async (props) => {
    const {
      rootDocument,
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

    const newValue = objectPath.get(rootDocument.data, this.getPath());

    if (!calcTriggers.length) return;

    const popupTriggers = (onClose ? triggersOnDelete : calcTriggers).filter(
      ({ source, openPopup }) => {
        const exists = []
          .concat(source)
          .filter(Boolean)
          .filter((item) => {
            let indexCount = 0;

            const sourcePath =
              openPopup && opening
                ? item.replace(/\$\{.+?}/g, () => {
                    while (
                      indexCount < path.length &&
                      typeof path[indexCount] !== 'number'
                    ) {
                      indexCount++;
                    }

                    return indexCount < path.length ? path[indexCount++] : '';
                  })
                : item.replace(/\$\{.+?}/, pathIndex?.index);

            return sourcePath === this.getPath().join('.');
          });
        return exists.length;
      },
    );

    if (!popupTriggers.length) return;

    const newData = await handleTriggers(
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

    actions.setValues(this.removeEmptyFields(newData));
  };

  handleActionTriggers = async (path, changes, data) => {
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
    const actionTriggers = calcTriggers.filter(({ action }) => !!action);

    const parentPath = dataPath.slice(0, dataPath.length - 1);
    const parentData = objectPath.get(data, parentPath);

    const documentData = await handleActionTriggers(actionTriggers, {
      documentData: data,
      dataPath: dataPath.join('.'),
      value: changes,
      parentData,
      stepData: data[dataPath[0]],
      actions: { requestExternalData: popupActions.requestExternalData },
    });

    return documentData;
  };

  getControlCleanWhenHidden = (args) => {
    const { schema } = this.props;

    const newArgs = [...args];

    newArgs.pop();

    const controlSchema = objectPath.get(
      schema.properties,
      newArgs.join('.properties.'),
    );

    return controlSchema?.cleanWhenHidden;
  };

  getPopupProps = () => {
    const { rootDocument } = this.state;
    const { schema, stepName, template, rootValue } = this.props;

    let pageSchema = schema;

    if (template && template.jsonSchema && !rootValue && stepName) {
      const {
        jsonSchema: { properties },
      } = template;
      pageSchema = properties[stepName];
    }

    const rootPath = [stepName].filter(Boolean);

    const pageData = objectPath.get(rootDocument.data, rootPath);
    return { pageSchema, pageData };
  };

  removeEmptyFields = (object = {}) => {
    const recursiveObj = (obj) => {
      (Object.keys(obj) || []).forEach((key) => {
        if (obj[key] === null) delete obj[key];
        if (typeof obj[key] === 'object') recursiveObj(obj[key]);
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

  getExternalPath = (path) => {
    const { pathIndex, path: pathOrigin } = this.props;

    if (pathIndex) {
      const pathIndexes = pathOrigin.filter((item) => !isNaN(item));

      const replacedPath = pathIndexes.reduce((acc, item) => {
        return acc.replace('${index}', item);
      }, path);

      return cutTrash(replacedPath);
    }

    return cutTrash(path);
  };

  triggerExternalReader = async (args) => {
    const { rootDocument, schema, stepName, taskId, path } = this.props;

    if (!schema) return false;

    const changes = args.pop();

    const controlSchema = objectPath.get(
      schema.properties,
      args.join('.').replace(/\.\d+\./, '.items.properties.'),
    );
    const indexPath = args.filter((item) => !isNaN(item));

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
          triggerExternalPath: [stepName].concat(path).concat(args),
        });
      }
      await waiter.run(taskId);
      await this.handleExternalReadersCall(asyncCheck, true, indexPath);
      await this.handlePopupTriggers({
        indexPath,
      });
    }

    return true;
  };

  setExternalErrorMessage = (result, serviceErrorMessage) => {
    if (!serviceErrorMessage) return;
    const { externalMessage } = this.state;

    let evaluatedErrorMessage = evaluate(serviceErrorMessage, result);

    if (evaluatedErrorMessage instanceof Error) {
      evaluatedErrorMessage = serviceErrorMessage;
    }

    if (externalMessage.length) {
      this.setState({
        externalMessage: externalMessage.concat(evaluatedErrorMessage),
      });
    } else {
      this.setState({
        externalMessage: [evaluatedErrorMessage],
      });
    }
  };

  externalReaderCheckActions = async (asyncCheck, trigger, indexPath) => {
    const {
      t,
      stepName,
      rootDocument,
      popupActions,
      pathIndex,
      actions,
      parentValue = {},
      name,
      path: pathOrigin,
      captchaEnabled
    } = this.props;
    const checkIsChecking = (asyncCheck || []).map(
      ({ isChecking }) => isChecking,
    );

    const isCheckingArray = (checkIsChecking || []).map((isCheckingFunc) => {
      const { path } = this.props;
      const documentData = (rootDocument && rootDocument.data) || {};
      const concatPath = [stepName].concat(path).join('.');
      const checking = evaluate(
        isCheckingFunc,
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

      const body = {
        service,
        method,
        path,
      };

      if (pathIndex) {
        body.index = pathOrigin
          .filter((item) => !isNaN(item))
          .concat(indexPath || []);
      }

      const enabled = (captchaEnabled.isEnabledFor || []).includes(`${service}.${method}`);

      const captcha = !enabled ? null : await popupActions.getExternalReaderCaptcha(
        service,
        method,
      );

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
        const concatPath = [stepName].concat(path).join('.');
        ignore = evaluate(
          isIgnoreErrorsFunc,
          result || result.data || {},
          objectPath.get(documentData, concatPath),
          documentData[stepName],
          documentData,
        );
        if (ignore instanceof Error) ignore = false;
      }

      const updateDocumentErrorPath = async (value) => {
        const { rootDocument } = this.state;
        const newData = { ...rootDocument };
        let errorPathInDocument = errorPath;

        if (pathIndex) {
          const pathIndexes = pathOrigin.filter((item) => !isNaN(item));
          errorPathInDocument = pathIndexes.reduce((acc, item) => acc.replace('${index}', item), errorPath);
          errorPathInDocument = cutTrash(errorPathInDocument);
        }

        objectPath.set(newData.data, errorPathInDocument, value);
        await actions.setValues(newData.data, false);
      };

      const sanitizeTraceId = (message) => {
        const regex = /"traceId":"([^"]+)"/;
        return `${message}`.replace(regex, '"traceId":""');
      };

      if (result instanceof Error) {
        if (!ignore) {
          this.setExternalErrorMessage(result, serviceErrorMessage);
        }

        if (errorPath) {
          const newErrorMessage = sanitizeTraceId(result);
          const prevErrorMessage = sanitizeTraceId(objectPath.get(this.state.rootDocument.data, errorPath)?.error || '');

          if (prevErrorMessage !== newErrorMessage) {
            await updateDocumentErrorPath({ error: `${result}` });
          }
        }
      } else {
        const errors = (checkValid || [])
          .map(({ isValid, errorText }) => {
            const replacedPath = this.getExternalPath(path);
            const resultValue = objectPath.get(result.data, replacedPath);
            const res = evaluate(isValid, resultValue, result.data[stepName] || {}, result.data || {}, parentValue[name] || {});
            if (res instanceof Error) return null;
            if (res === false) {
              const errorTextEvaluated = evaluate(errorText, result.data[stepName] || {}, result.data || {}, resultValue);
              return renderHTML(errorTextEvaluated instanceof Error ? errorText : errorTextEvaluated);
            }
            return null;
          })
          .filter(Boolean);

        if (errors.length) {
          this.setState({ externalMessage: this.state.externalMessage.concat(errors) });
        }

        await actions.forceReload();

        if (errorPath) {
          await updateDocumentErrorPath(undefined);
        }
      }
    });
  };

  getExternalReaders = () =>
    (Object.values(this.props || {}) || []).filter(Boolean).filter((prop) => {
      if (typeof prop === 'object' && prop.control === 'externalReaderCheck') {
        return true;
      }

      return false;
    });

  handleExternalReadersCall = async (asyncCheck, trigger, indexPath) => {
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

    let errors = validateData(
      this.removeEmptyFields(pageData),
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
      await waiter.run(taskId);
    } else {
      const result = await actions.setValues(rootDocumentData, false);
      if (result) {
        this.setState({ errors: result, loading: false });
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
    return [stepName]
      .concat(path)
      .filter((p) => p !== null && p !== undefined && p !== '');
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
          open={open}
          onClose={(event, reason) => {
            if (reason === 'backdropClick') {
              return false;
            }

            return this.handleClose();
          }}
          scroll="body"
          fullScreen={fullScreen}
          classes={{
            root: classes.dialogRoot,
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
              ref={this.finishRef}
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
                      <Typography key={index}>{mss}</Typography>
                    ))}
                  </div>
                ) : null}
                {!loading && externalMessage.length ? (
                  <FormControl className={classes.root}>
                    <div className={classes.poper}>
                      {externalMessage.map((mss, index) => (
                        <Typography key={index}>{mss}</Typography>
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
                  label: classes.btnpadding,
                }}
                aria-label={saveText || t('Edit')}
              >
                {saveText || t('Edit')}
              </Button>
            </DialogActions>
          ) : null}
        </Dialog>
        {captcha ? <Altcha ref={this.altchaRef} captcha={captcha} /> : null}
      </>
    );
  };
}

DialogWrapper.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  properties: PropTypes.object.isRequired,
  originDocument: PropTypes.object.isRequired,
  schema: PropTypes.object.isRequired,
  stepName: PropTypes.string.isRequired,
  readOnly: PropTypes.bool,
  description: PropTypes.string,
  dialogTitle: PropTypes.string,
  path: PropTypes.array,
  steps: PropTypes.array,
  taskId: PropTypes.string,
  rootDocument: PropTypes.object,
  activeStep: PropTypes.number,
  handleClose: PropTypes.func.isRequired,
  saveText: PropTypes.string,
  actions: PropTypes.object,
  popupActions: PropTypes.object,
  open: PropTypes.bool,
  template: PropTypes.object.isRequired,
  pathIndex: PropTypes.object,
  saveLocalDataOnInit: PropTypes.bool,
  active: PropTypes.bool,
  disableForceSave: PropTypes.bool,
};

DialogWrapper.defaultProps = {
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

const mapStateToProps = ({
  externalReader
}) => ({
  captchaEnabled: externalReader?.captcha || {}
});

const mapDispatchToProps = (dispatch) => ({
  popupActions: {
    setPopupData: bindActionCreators(setPopupData, dispatch),
    externalReaderCheckData: bindActionCreators(
      externalReaderCheckData,
      dispatch,
    ),
    requestExternalData: (requestData) =>
      api.post(
        'external_reader',
        requestData,
        'REQUEST_EXTERNAL_DATA',
        dispatch,
      ),
    getExternalReaderCaptcha: bindActionCreators(
      getExternalReaderCaptcha,
      dispatch,
    ),
  },
});

const styled = withStyles(styles)(DialogWrapper);
const translated = translate('Elements')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
