import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import objectPath from 'object-path';
import queue from 'queue';
import classNames from 'classnames';
import {
  Typography,
  Button,
  Fade,
  Toolbar,
  AppBar,
  Radio,
  RadioGroup,
  FormControlLabel,
  Dialog
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';

import evaluate from 'helpers/evaluate';
import renderHTML from 'helpers/renderHTML';
import uploadScript from 'helpers/uploadScript';
import getProcessedFromPayment from 'helpers/getProcessedFromPayment';
import { addMessage } from 'actions/error';
import {
  getPaymentInfo,
  getPaymentStatus,
  loadTask,
  validateAppleSession
} from 'application/actions/task';
import ProgressLine from 'components/Preloader/ProgressLine';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import { SchemaForm, validateData } from 'components/JsonSchema';
import Message from 'components/Snackbars/Message';
import SuccessMessage from 'modules/tasks/pages/Task/components/SuccessMessage';
import mastercard from 'assets/img/mastercard.svg';
import visa from 'assets/img/visa.svg';
import googlePay from 'assets/img/google-pay.svg';
import applePay from 'assets/img/applepay.svg';
import privat_24 from 'assets/img/privat24.svg';
import { getConfig } from 'helpers/configLoader';

const awaitDelay = (delay) => new Promise((fulfill) => setTimeout(fulfill, delay));
const initTimeout = 200;

const styles = (theme) => ({
  widgetWrapper: {
    padding: '23px 0px 15px 30px',
    '& iframe': {
      height: '180px!important'
    }
  },
  widgetWrapperOneMethod: {
    paddingTop: 23,
    '& iframe': {
      height: '180px!important'
    }
  },
  icon: {
    color: 'green'
  },
  flex: {
    display: 'flex'
  },
  mt20: {
    marginTop: 20
  },
  mb20: {
    marginBottom: 20
  },
  errorText: {
    marginBottom: 10,
    [theme.breakpoints.down('md')]: {
      fontSize: 13
    }
  },
  appBar: {
    top: 'auto',
    backgroundColor: '#fff',
    bottom: 0
  },
  toolbar: {
    margin: 0,
    padding: 20,
    paddingLeft: 0,
    [theme.breakpoints.up('sm')]: {
      padding: '20px 32px',
      paddingLeft: 0
    }
  },
  button: {
    marginRight: 16
  },
  createPDF: {
    [theme.breakpoints.up('sm')]: {
      padding: 0,
      fontSize: '0.8rem'
    }
  },
  removeBtn: {
    color: 'rgba(0, 0, 0, 0.54)',
    borderColor: 'transparent',
    marginLeft: 'auto'
  },
  disabledBorder: {
    border: 'none!important'
  },
  loaderWrapper: {
    marginBottom: 20,
    marginTop: 20
  },
  successMessage: {
    position: 'fixed',
    width: '100%'
  },
  paymentTypes: {
    paddingTop: 40,
    paddingRight: 30,
    maxHeight: 80
  },
  finalTextWrapper: {
    display: 'flex',
    marginBottom: 50
  },
  hidden: {
    display: 'none'
  }
});

class PaymentWidget extends React.Component {
  constructor(props) {
    super(props);
    const config = getConfig();

    const {
      ugbToken,
      posId,
      gpayMerchantId,
      gpayMerchantName,
      paymentEnvironment,
      paymentCheckDelay,
      application: { environment }
    } = config;

    this.ugbToken = ugbToken;
    this.posId = posId;
    this.gpayMerchantId = gpayMerchantId;
    this.gpayMerchantName = gpayMerchantName;
    this.paymentEnvironment = paymentEnvironment;
    this.environment = environment;
    this.requestDelay = paymentCheckDelay || 3000;

    const { defaultMethod } = this.props;

    this.state = {
      loading: true,
      initError: null,
      isSuccess: false,
      inited: false,
      isPending: false,
      calculatedHistory: null,
      processed: null,
      extraData: null,
      messageShown: false,
      validateErrors: [],
      anotherPaymentWidgetIsBusy: false,
      loopRequest: [...Array(120).keys()],
      widget: defaultMethod === 'card',
      applepay: defaultMethod === 'applePay',
      gpay: defaultMethod === 'googlePay',
      privat24: defaultMethod === 'privatPay'
    };

    this.triggerTokenizer = React.createRef();
    this.queue = queue({ autostart: true, concurrency: 1 });
    this.queueAppleGoogle = queue({ autostart: true, concurrency: 1 });

    this.broadcastChannel = new BroadcastChannel(
      [props.rootDocument?.id].concat(props.path || []).join()
    );
    this.broadcastChannel.onmessage = this.handleBroadcastMessage;
  }

  handleBroadcastMessage = (event) => {
    const { isSuccess, isPending } = this.state;

    const message = JSON.parse(event.data);
    switch (message.type) {
      case 'paymentState':
        if (message.payload?.isSuccess || message.payload?.isPending) {
          this.setState({ anotherPaymentWidgetIsBusy: true });
        }
        break;
      case 'checkWidgetStatus':
        if (isPending || isSuccess) {
          this.broadcastChannel.postMessage(
            JSON.stringify({
              type: 'paymentState',
              payload: {
                isSuccess,
                isPending
              }
            })
          );
        }
        break;
      case 'activePaymentWidgetFocus':
        if (isPending || isSuccess) {
          window.location.reload();
        }
        break;
      default:
      // Nothing to do
    }
  };

  setId = () => {
    const { path } = this.props;
    return (path || []).join('.');
  };

  handleChange = async (name, val) => {
    const { onChange, value } = this.props;
    const { data } = val;

    onChange({
      ...value,
      [name]: data === null ? [] : data || val
    });
  };

  getAmount = () => {
    const { recipients, rootDocument } = this.props;

    const countSum = []
      .concat(recipients)
      .map(({ amount }) => {
        const result = evaluate(amount, rootDocument.data);

        if (result instanceof Error) return 0;

        return result;
      })
      .reduce((a, b) => a + b, 0);

    return countSum;
  };

  renderChildren = () => {
    const {
      schema,
      taskId,
      activeStep,
      rootDocument,
      originDocument,
      stepName,
      errors,
      path,
      items,
      steps,
      value
    } = this.props;
    const { loading } = this.state;

    if (!items) return null;

    return (
      <>
        {Object.keys(items.properties).map((key) => (
          <div key={key}>
            <SchemaForm
              readOnly={loading}
              steps={steps}
              taskId={taskId}
              activeStep={activeStep}
              rootDocument={rootDocument}
              originDocument={originDocument}
              stepName={stepName}
              errors={errors}
              schema={items.properties[key]}
              path={path.concat(key)}
              value={(value || {})[key]}
              onChange={this.handleChange.bind(null, key)}
              required={
                Array.isArray(schema.required) ? schema.required.includes(key) : schema.required
              }
            />
          </div>
        ))}
      </>
    );
  };

  showStatus = ({ isSuccess, isPending, extraData }) => {
    const { importActions } = this.props;

    this.setState({ messageShown: true });

    if (!isSuccess && isPending) {
      importActions.addMessage(new Message('PendingPaymentStatus', 'warning'));
    }

    if (isSuccess && !isPending) {
      this.validateControl();
      importActions.addMessage(new Message('SuccessPaymentStatus', 'success'));
    }

    if (!isSuccess && !isPending) {
      this.validateControl();
      const errorMessage = (data) => {
        if (
          data &&
          data?.status_description &&
          data?.status_description !== '3-D Secure verification timeout'
        ) {
          return data?.status_description;
        }
        return 'ErrorPaymentStatus';
      };
      importActions.addMessage(new Message(errorMessage(extraData), 'error'));
    }

    setTimeout(() => {
      this.setState({ messageShown: false });
    }, 1000);
  };

  checkPaymentAction = async () => {
    this.setState({ loading: true });

    await this.checkPaymentStatus({ silent: false, isReload: true });

    this.setState({ loading: false });
  };

  checkPaymentStatus = async ({ silent, isReload }) => {
    const {
      taskId,
      importActions,
      rootDocument: { id }
    } = this.props;

    const result = await importActions.getPaymentStatus(id);

    result && this.parseResult({ result, silent, isReload });

    await importActions.loadTask(taskId);
  };

  onToken = async (tokenData) => {
    const {
      importActions,
      rootDocument: { id },
      paymentControlPath
    } = this.props;

    if (!tokenData || !tokenData.token) {
      importActions.addMessage(new Message('FaildedGettingPaymentToken', 'error'));
      this.initWidget();
      return;
    }

    const { token } = tokenData;

    this.setState({ loading: true });

    const result = await importActions.getPaymentInfo(id, {
      paymentControlPath,
      extraData: {
        token,
        browserFingerprint: {
          browserColorDepth: window.screen.colorDepth,
          browserScreenHeight: window.screen.height,
          browserScreenWidth: window.screen.width,
          browserJavaEnabled: navigator.javaEnabled(),
          browserLanguage: navigator.language,
          browserTimeZone: new Date().getTimezoneOffset(),
          browserTimeZoneOffset: new Date().getTimezoneOffset(),
          browserAcceptHeader:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          browserIpAddress: '127.0.0.1',
          browserUserAgent: navigator.userAgent
        }
      }
    });

    if (!result) {
      this.initWidget();
      this.setState({ loading: false });
    } else {
      await this.parseResult({
        result,
        isUserAction: true
      });
    }
  };

  getControlPath = () => {
    const { path, stepName } = this.props;
    const controlPath = [stepName].concat(path).join('.');
    return controlPath;
  };

  validateDocument = async () => {
    const { actions, task, t } = this.props;

    const validateDocument = await actions.validateDocument(task.documentId);

    if (validateDocument instanceof Error) {
      const controlPath = this.getControlPath();

      const errors = (validateDocument?.details || []).filter(
        ({ dataPath }) => dataPath !== controlPath
      );

      if (!errors.length) return true;

      this.setState({
        loading: false,
        validateErrors: [
          {
            errorText: t('ErrorValidatingDocument')
          }
        ]
      });

      this.queue.stop();

      this.queueAppleGoogle.stop();

      return false;
    }

    return true;
  };

  validateControl = async () => {
    const { value, schema, rootDocument } = this.props;

    const virtualizedValue = {
      ...(value || {}),
      isSuccess: getProcessedFromPayment({
        ...(value || {})
      })
    };

    const errors = validateData(virtualizedValue, schema, rootDocument?.data);

    if (errors.length) {
      this.setState({
        loading: false,
        validateErrors: [
          {
            errorText: errors.map(({ errorText }) => errorText).join(', ')
          }
        ]
      });
    }
  };

  renderFinalScreen = () => {
    const {
      t,
      task,
      taskId,
      classes,
      rootPath,
      commitAfterPayment,
      finalText,
      template: { jsonSchema }
    } = this.props;

    if (!commitAfterPayment) {
      return (
        <Typography className={classes.finalTextWrapper}>
          <CheckRoundedIcon className={classes.icon} />
          {finalText || t('PaymentWidgetFinalText')}
        </Typography>
      );
    }

    return (
      <Dialog open={true} TransitionComponent={'div'} aria-labelledby="dialog">
        <div id="dialog">
          <SuccessMessage {...jsonSchema} taskId={taskId} rootPath={rootPath} task={task} />
        </div>
      </Dialog>
    );
  };

  parseResult = async ({ result, isUserAction, silent, isReload }) => {
    if (!result) return;

    const controlPath = this.getControlPath();

    const paymentInfo = objectPath.get(result.data, controlPath);

    if (!paymentInfo) return;

    const { processed, calculated, calculatedHistory, paymentRequestData } = paymentInfo;

    this.setState({ calculatedHistory });

    if (!isUserAction) {
      this.setState({ inited: !!calculated });
    }

    if (!calculated) return;

    const {
      extraData: { user_action_required, user_action_url }
    } = calculated;

    if (user_action_required && isUserAction) {
      window.location.href = user_action_url;
      return;
    }

    if (paymentRequestData) {
      window.location.href = paymentRequestData.url;
      return;
    }

    const processedItem = processed && processed[processed.length - 1];

    if (!processedItem) {
      if (isReload && !silent) {
        this.showStatus({ isSuccess: false, isPending: true });
        return;
      }
      this.checkPaymentStatusLoop();
    }

    const paymentStatus = processedItem?.status;

    const isSuccess = paymentStatus?.isSuccess || false;
    const isPending = paymentStatus?.isPending || false;
    const extraData = processedItem?.extraData || false;
    const isProcessed = !!processed;

    this.setState({
      isSuccess,
      isPending,
      isProcessed,
      processed,
      extraData
    });

    if (!silent) {
      const pendingLast = calculatedHistory?.length === processed?.length;
      if (pendingLast) {
        this.showStatus({ isSuccess, isPending, extraData });
        return;
      }
      this.showStatus({ isSuccess: false, isPending: true });
    }
  };

  init = async () => {
    const { allowMethods } = this.props;

    this.setState({ loading: true });

    await this.checkPaymentStatus({ silent: true });

    const { inited } = this.state;

    if (inited) {
      const { loopRequest } = this.state;

      await awaitDelay(500);

      loopRequest.forEach((index) =>
        this.queue.push(async () => {
          const { commitAfterPayment, task } = this.props;
          const { isSuccess, isPending, calculatedHistory, processed, extraData, messageShown } =
            this.state;

          const isFinished = commitAfterPayment ? task?.finished : true;

          if (isSuccess && isFinished) return;

          const isLastItem =
            (calculatedHistory && calculatedHistory.length) === (processed && processed.length);

          if (!isSuccess && !isPending && isLastItem) {
            !messageShown && this.showStatus({ isSuccess, isPending, extraData });
            return;
          }

          await awaitDelay(this.requestDelay);

          await this.checkPaymentStatus({
            silent: index < loopRequest.length - 1,
            isReload: true
          });
        })
      );
    }

    if (!allowMethods.includes('card')) {
      this.setState({ loading: false });
      return;
    }

    this.queue.push(() => {
      this.initWidget();
      this.initWidgetEvents();
    });
  };

  initWidget = () => {
    this.widget = UGBWidget.quick_init({
      key: this.ugbToken,
      amount: this.getAmount(),
      mode: 'inline',
      lang: 'uk',
      type: 'full_card',
      selector: this.setId(),
      style: 'diia',
      template: 'diiaLight',
      properties: {
        showSubmit: false
      },
      onToken: this.onToken.bind(this)
    });

    this.widget.open();
  };

  initWidgetEvents = () => {
    const { importActions } = this.props;

    this.widget
      .onReady()
      .then(() => {
        const { actions } = this.props;
        const { current } = this.triggerTokenizer;
        this.setState({ loading: false });
        if (!current) {
          importActions.addMessage(new Message('PaymentInitError', 'error'));
          return;
        }

        current.addEventListener('click', () => {
          this.widget.validateForm().then(async (isValid) => {
            this.broadcastChannel.postMessage(
              JSON.stringify({
                type: 'paymentState',
                payload: {
                  isPending: true
                }
              })
            );
            const valid = await actions.validateStep(null, {
              ignorePaymentControl: true
            });

            const validDocument = await this.validateDocument();

            if (!validDocument || !valid) return false;

            isValid && this.widget.formSubmit();
          });
        });
      })
      .catch((e) => {
        importActions.addMessage(new Message(`${e.detail.id}, ${e.detail.message}`, 'error'));
        this.setState({
          initError: e.detail.message,
          loading: false
        });
      });
  };

  handleRadioChange = (event) => {
    const value = event && event.target && event.target.value;
    const checked = event && event.target && event.target.checked;

    this.setState({
      widget: false,
      applepay: false,
      gpay: false,
      privat24: false,
      [value]: checked
    });
  };

  checkPaymentStatusLoop = () => {
    const { loopRequest } = this.state;

    this.setState({ loading: true });

    const checkStatus = async (index) => {
      const { isSuccess } = this.state;

      const { task, commitAfterPayment } = this.props;

      if (isSuccess && (!commitAfterPayment || (commitAfterPayment && task?.finished))) {
        this.setState({ loading: false });
        return;
      }

      const isLast = index === loopRequest.length - 1;

      await awaitDelay(this.requestDelay);

      await this.checkPaymentStatus({
        silent: !isLast,
        isReload: true
      });

      if (isLast) this.setState({ loading: false });
    };

    loopRequest.forEach((index) => this.queueAppleGoogle.push(() => checkStatus(index)));
  };

  initPayment = async () => {
    const {
      actions,
      importActions,
      rootDocument: { id },
      paymentControlPath
    } = this.props;
    const { applepay, gpay } = this.state;

    this.broadcastChannel.postMessage(JSON.stringify({ type: 'checkWidgetStatus' }));
    await awaitDelay(initTimeout);

    let valid = true;
    let validDocument = true;

    if (!(applepay && window.ApplePaySession)) {
      valid = await actions.validateStep(null, {
        ignorePaymentControl: true
      });

      validDocument = await this.validateDocument();
    }

    if (!validDocument || !valid) return false;

    const payway = applepay ? 'applepay' : gpay ? 'googlepay' : 'privat24';

    if (gpay) {
      const paymentsClient = new window.google.payments.api.PaymentsClient({
        environment: this.paymentEnvironment
      });

      const paymentRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        merchantInfo: {
          merchantId: this.gpayMerchantId,
          merchantName: this.gpayMerchantName
        },
        allowedPaymentMethods: [
          {
            type: 'CARD',
            parameters: {
              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
              allowedCardNetworks: ['MASTERCARD', 'VISA']
            },
            tokenizationSpecification: {
              type: 'PAYMENT_GATEWAY',
              parameters: {
                gateway: 'ukrgasbankpay',
                gatewayMerchantId: this.posId
              }
            }
          }
        ],
        transactionInfo: {
          currencyCode: 'UAH',
          totalPriceStatus: 'FINAL',
          totalPrice: String(this.getAmount())
        }
      };

      if (paymentsClient) {
        paymentsClient
          .loadPaymentData(paymentRequest)
          .then(async (paymentData) => {
            const paymentToken = paymentData.paymentMethodData.tokenizationData.token;
            const encrypted = window.btoa(paymentToken);

            this.setState({ loading: true });

            const result = await importActions.getPaymentInfo(id, {
              paymentControlPath,
              extraData: { payway, ccToken: encrypted }
            });

            this.setState({ loading: false });

            if (result instanceof Error) return;

            result && this.parseResult({ result, isUserAction: true });

            this.checkPaymentStatusLoop();
          })
          .catch((err) => {
            console.log(err);
          });
      }
    } else if (applepay && window.ApplePaySession) {
      const paymentRequest = {
        countryCode: 'UA',
        currencyCode: 'UAH',
        supportedNetworks: ['visa', 'masterCard'],
        merchantCapabilities: ['supports3DS'],
        total: {
          label: 'ФК ЕДИНИЙ ПРОСТІР',
          amount: String(this.getAmount())
        }
      };

      const applePaySession = new window.ApplePaySession(9, paymentRequest);

      applePaySession.onvalidatemerchant = async (event) => {
        const validationUrl = event.validationURL;
        const displayName = 'Diia Merchant';
        const initiative = 'web';
        const initiativeContext = window.location.hostname;

        const merchantSession = await importActions.validateAppleSession({
          validationUrl,
          displayName,
          initiative,
          initiativeContext
        });

        if (merchantSession instanceof Error) {
          applePaySession.abort();
          return;
        }

        await applePaySession.completeMerchantValidation(merchantSession);
      };

      applePaySession.onpaymentauthorized = async (event) => {
        const tokenB64 = window.btoa(JSON.stringify(event.payment.token));

        this.setState({ loading: true });

        const result = await importActions.getPaymentInfo(id, {
          paymentControlPath,
          extraData: {
            payway,
            ccToken: tokenB64
          }
        });

        this.setState({ loading: false });

        if (result instanceof Error) return;

        result && this.parseResult({ result, isUserAction: true });

        applePaySession.completePayment(window.ApplePaySession.STATUS_SUCCESS);

        this.checkPaymentStatusLoop();
      };

      applePaySession.begin();

      const validApplePay = await actions.validateStep(null, {
        ignorePaymentControl: true
      });

      const validDocumentApplePay = await this.validateDocument();

      if (!validApplePay || !validDocumentApplePay) {
        applePaySession.abort();
      }
    } else {
      this.setState({ loading: true });

      const result = await importActions.getPaymentInfo(id, {
        paymentControlPath,
        extraData: { payway }
      });

      this.setState({ loading: false });

      if (result instanceof Error) return;

      result && this.parseResult({ result, isUserAction: true });
    }
  };

  renderPaymentMethods = () => {
    const { t, classes, allowMethods } = this.props;
    const { widget, applepay, gpay, privat24, loading } = this.state;

    const id = this.setId();
    const isAppleSupported = !!(window.PaymentRequest && window.ApplePaySession);

    if (allowMethods.length === 1) {
      const method = allowMethods[0];

      switch (method) {
        case 'card':
          return (
            <>
              <Typography>{t('Widget')}</Typography>
              <div
                id={id}
                className={classes.widgetWrapperOneMethod}
                style={{ display: widget ? 'block' : 'none' }}
              />
            </>
          );
        case 'applePay':
          return renderHTML(
            `<div style="display:flex; margin-bottom: 30px;"><span style="margin-right: 11px;">Apple Pay</span> <img src=${applePay} alt="Apple Pay"/></div>`
          );
        case 'googlePay':
          return renderHTML(
            `<div style="display:flex; margin-bottom: 30px;"><span style="margin-right: 11px;">Google Pay</span> <img src=${googlePay} alt="Google Pay"/></div>`
          );
        case 'privatPay':
          return renderHTML(
            `<div style="display:flex; margin-bottom: 30px;"><span style="margin-right: 11px;">Privat Pay</span> <img src=${privat_24} alt="Privat"/></div>`
          );
        default:
          return 'no methods selected';
      }
    }

    return (
      <>
        <RadioGroup className={classes.mb20} row={false}>
          {allowMethods.includes('card') ? (
            <>
              <FormControlLabel
                control={
                  <Radio
                    id={'widget-radio'}
                    value={'widget'}
                    checked={widget}
                    onChange={this.handleRadioChange}
                    disabled={loading}
                    aria-label={t('Widget')}
                  />
                }
                label={t('Widget')}
              />

              <div
                id={id}
                className={classes.widgetWrapper}
                style={{ display: widget ? 'block' : 'none' }}
              />
            </>
          ) : null}

          {allowMethods.includes('applePay') && isAppleSupported ? (
            <>
              <FormControlLabel
                control={
                  <Radio
                    id={'applepay-radio'}
                    value={'applepay'}
                    checked={applepay}
                    onChange={this.handleRadioChange}
                    disabled={loading}
                    aria-label={t('ApplePay')}
                  />
                }
                label={renderHTML(
                  `<div style="display:flex;"><span style="margin-right: 11px;">Apple Pay</span> <img src=${applePay} alt="Apple Pay"/></div>`
                )}
              />
            </>
          ) : null}

          {allowMethods.includes('googlePay') ? (
            <>
              <FormControlLabel
                control={
                  <Radio
                    id={'gpay-radio'}
                    value={'gpay'}
                    checked={gpay}
                    onChange={this.handleRadioChange}
                    disabled={loading}
                    aria-label={t('GooglePay')}
                  />
                }
                label={renderHTML(
                  `<div style="display:flex;"><span style="margin-right: 11px;">Google Pay</span> <img src=${googlePay} alt="Google Pay"/></div>`
                )}
              />
            </>
          ) : null}

          {allowMethods.includes('privatPay') ? (
            <>
              <FormControlLabel
                control={
                  <Radio
                    id={'privat-radio'}
                    value={'privat24'}
                    checked={privat24}
                    onChange={this.handleRadioChange}
                    disabled={loading}
                    aria-label={t('PrivatPay')}
                  />
                }
                label={renderHTML(
                  `<div style="display:flex;"><span style="margin-right: 11px;">Privat Pay</span> <img src=${privat_24} alt="Privat"/></div>`
                )}
              />
            </>
          ) : null}
        </RadioGroup>
      </>
    );
  };

  componentDidMount = async () => {
    const { hidden } = this.props;

    if (hidden) return;

    clearTimeout(this.timeout);

    if (this.environment === 'production') {
      await uploadScript('https://widget.cp.ukrgasbank.com/static/widget.js');
    } else {
      await uploadScript('https://widget.cp-dev.ukrgasbank.com/static/widget.js');
    }

    this.timeout = setTimeout(() => {
      uploadScript('https://pay.google.com/gp/p/js/pay.js');
      this.init();
    }, initTimeout);
  };

  componentWillUnmount = () => {
    clearTimeout(this.timeout);
    this.broadcastChannel.close();
  };

  render = () => {
    const {
      t,
      classes,
      hidden,
      description,
      required,
      error,
      sample,
      steps,
      stepName,
      handlePrevStep,
      allowMethods,
      task,
      commitAfterPayment
    } = this.props;
    const {
      loading,
      initError,
      isSuccess,
      isPending,
      isProcessed,
      inited,
      processed,
      widget,
      validateErrors,
      anotherPaymentWidgetIsBusy
    } = this.state;

    const isFinished = commitAfterPayment ? task?.finished : true;

    if (!allowMethods || !allowMethods.length) return null;

    if (hidden) return null;

    const isFinalScreen =
      isSuccess || (processed && processed.find(({ status: { isSuccess: anyPayed } }) => anyPayed));
    const successedAndCommited = commitAfterPayment ? task.finished : true;

    if (isFinalScreen && successedAndCommited) {
      return this.renderFinalScreen();
    }

    const isError = !isSuccess && !isPending && isProcessed;
    const isPayed = isSuccess && !isPending && isProcessed;
    const isUpdateble = !isError && !isPayed && inited;

    const isFirstStep = (steps && steps[0]) === stepName;

    if (anotherPaymentWidgetIsBusy) {
      return (
        <ElementContainer
          description={description}
          sample={sample}
          required={required}
          error={error}
          bottomSample={true}
        >
          <Typography className={classes.errorText} variant={'body2'} style={{ display: 'flex' }}>
            <WarningIcon style={{ color: '#d32f2f' }} />
            {t('AnotherPaymentWidgetIsActive')}
          </Typography>
        </ElementContainer>
      );
    }

    return (
      <ElementContainer
        description={description}
        sample={sample}
        required={required}
        error={error}
        bottomSample={true}
      >
        {this.renderPaymentMethods()}

        {this.renderChildren()}

        {loading ? (
          <div className={classes.loaderWrapper}>
            <ProgressLine loading={loading} />
          </div>
        ) : null}

        {initError ? (
          <>
            <WarningIcon style={{ color: '#d32f2f' }} />
            <Typography className={classes.errorText} variant={'body2'}>
              {initError}
            </Typography>
          </>
        ) : null}

        {validateErrors.map(({ errorText }) => (
          <>
            <WarningIcon style={{ color: '#d32f2f' }} />
            <Typography className={classes.errorText} variant={'body2'}>
              {errorText}
            </Typography>
            <Typography className={classes.errorText} variant={'body2'}>
              {t('tryReload')}
            </Typography>
          </>
        ))}

        {!loading && isUpdateble && !validateErrors.length ? (
          <Fade in={true}>
            <Button
              className={classes.mb20}
              onClick={this.checkPaymentAction}
              classes={{ label: classes.buttonLabel }}
              aria-label={t('RefreshPaymentStatus')}
            >
              <RefreshIcon className={classes.refreshIcon} />
              {t('RefreshPaymentStatus')}
            </Button>
          </Fade>
        ) : null}

        <AppBar position="relative" className={classes.appBar} elevation={0}>
          <Toolbar className={classes.toolbar}>
            {isFirstStep ? null : (
              <Button
                size="large"
                variant="outlined"
                disabled={loading}
                onClick={handlePrevStep}
                className={classes.button}
                classes={{ disabled: classes.disabledBorder }}
                aria-label={t('Back')}
              >
                {t('Back')}
              </Button>
            )}

            <Button
              ref={this.triggerTokenizer}
              size="large"
              color="primary"
              variant="contained"
              className={classNames({
                [classes.button]: true,
                [classes.hidden]: !widget
              })}
              disabled={loading || initError || (commitAfterPayment && isSuccess && !isFinished)}
              aria-label={t('MakePayment')}
            >
              {t('MakePayment')}
            </Button>

            <Button
              onClick={this.initPayment}
              size="large"
              color="primary"
              variant="contained"
              className={classNames({
                [classes.button]: true,
                [classes.hidden]: widget
              })}
              disabled={loading || initError}
              aria-label={t('MakePayment')}
            >
              {t('MakePayment')}
            </Button>
          </Toolbar>
          <Toolbar className={classes.toolbar}>
            <img src={mastercard} alt="Mastercard" className={classes.paymentTypes} />
            <img src={visa} alt="Visa" className={classes.paymentTypes} />
          </Toolbar>
        </AppBar>
      </ElementContainer>
    );
  };
}

PaymentWidget.propTypes = {
  hidden: PropTypes.bool,
  description: PropTypes.string,
  sample: PropTypes.string,
  error: PropTypes.object,
  required: PropTypes.bool,
  classes: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  recipients: PropTypes.number.isRequired,
  path: PropTypes.array.isRequired,
  rootDocument: PropTypes.object.isRequired,
  importActions: PropTypes.object.isRequired,
  paymentControlPath: PropTypes.string.isRequired,
  taskId: PropTypes.string.isRequired,
  stepName: PropTypes.string.isRequired,
  items: PropTypes.object,
  schema: PropTypes.object.isRequired,
  activeStep: PropTypes.number.isRequired,
  originDocument: PropTypes.object.isRequired,
  errors: PropTypes.array.isRequired,
  steps: PropTypes.array.isRequired,
  value: PropTypes.object,
  handlePrevStep: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  commitAfterPayment: PropTypes.bool,
  finalText: PropTypes.string,
  allowMethods: PropTypes.array,
  defaultMethod: PropTypes.string
};

PaymentWidget.defaultProps = {
  hidden: false,
  description: null,
  sample: null,
  error: null,
  required: false,
  items: null,
  value: {},
  commitAfterPayment: false,
  finalText: false,
  allowMethods: ['googlePay', 'applePay', 'privatPay', 'card'],
  defaultMethod: 'card'
};

const mapStateToProps = ({ errors: { list } }) => ({
  errorsList: list
});

const mapDispatchToProps = (dispatch) => ({
  importActions: {
    getPaymentInfo: bindActionCreators(getPaymentInfo, dispatch),
    getPaymentStatus: bindActionCreators(getPaymentStatus, dispatch),
    loadTask: bindActionCreators(loadTask, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
    validateAppleSession: bindActionCreators(validateAppleSession, dispatch)
  }
});

const styled = withStyles(styles)(PaymentWidget);

const translated = translate('Elements')(styled);

const connected = connect(mapStateToProps, mapDispatchToProps)(translated);

export default connected;
