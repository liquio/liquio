/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { translate, Translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import objectPath from 'object-path';
import qs from 'qs';
import {
  getPaymentInfo,
  getPaymentStatus,
  confirmSmsCode,
  loadTask,
} from 'application/actions/task';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import PaymentLayout from 'components/JsonSchema/elements/Payment/layout';
import QrLayout from 'components/JsonSchema/elements/Payment/qrLayout';
import PhoneLayout from 'components/JsonSchema/elements/Payment/phoneLayout';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import SuccessMessage from 'modules/tasks/pages/Task/components/SuccessMessage';
import processList from 'services/processList';
import waiter from 'helpers/waitForAction';
import renderHTML from 'helpers/renderHTML';
import evaluate from 'helpers/evaluate';

const awaitDelay = (delay: number) =>
  new Promise((fulfill) => {
    setTimeout(fulfill, delay);
  });

interface PaymentRequestData {
  requestUrl?: string;
  url?: string;
  body?: string;
  requestMethod?: string;
  qrCode?: string;
  [key: string]: unknown;
}

interface ImportActions {
  getPaymentInfo: (id: string | number, body: unknown) => Promise<unknown>;
  getPaymentStatus: (id: string | number) => Promise<{ data?: unknown } | undefined>;
  addMessage: (message: unknown) => unknown;
  loadTask: (taskId: string | number) => Promise<unknown>;
  confirmSmsCode: (body: unknown) => Promise<{ isConfirmed?: boolean }>;
}

interface PaymentProps {
  t: Translate;
  importActions: ImportActions;
  value?: { calculated?: unknown; processed?: Array<{ status: { isSuccess?: boolean } }> };
  rootDocument: { id: string | number; data: Record<string, unknown> };
  paymentControlPath: string;
  paymentType?: string | null;
  hidden?: boolean;
  taskId: string;
  withRedirect?: boolean;
  path: Array<string | number>;
  recipients: unknown;
  schema?: { disabledText?: string };
  commitAfterPayment?: boolean;
  jsonSchema?: Record<string, unknown>;
  rootPath?: string;
  task: { finished?: boolean; [key: string]: unknown };
  readOnly?: boolean;
  [key: string]: unknown;
}

interface PaymentState {
  paymentValue: number | string;
  phone: string;
  code: string;
  paymentRequestData: PaymentRequestData | null;
  loadingValue: boolean;
  loading: boolean;
  isSuccess: boolean;
  phoneExists: boolean;
  codeNotValid: boolean;
  phoneNotValid: boolean;
  timeout: unknown;
  inited: boolean;
  paymentFailed: boolean;
  isConfirmed?: boolean;
  failed?: boolean;
  successShownForTransactionId?: string | number | null;
  failureShownForTransactionId?: string | number | null;
}

export class Payment extends React.Component<PaymentProps, PaymentState> {
  static defaultProps: Partial<PaymentProps> = {
    paymentType: null,
    value: {},
    hidden: false,
    withRedirect: false,
  };

  constructor(props: PaymentProps) {
    super(props);
    this.state = {
      paymentValue: 0,
      phone: '',
      code: '',
      paymentRequestData: null,
      loadingValue: false,
      loading: false,
      isSuccess: false,
      phoneExists: false,
      codeNotValid: false,
      phoneNotValid: false,
      timeout: null,
      inited: false,
      successShownForTransactionId: null,
      paymentFailed: false,
      failureShownForTransactionId: null,
    };
  }

  onChangePhone = (value: string) => this.setState({ phone: value });

  onChangeCode = (value: string) => this.setState({ code: value });

  private paymentStarting = false;

  paymentAction = async () => {
    if (this.paymentStarting || this.state.isSuccess) return;
    this.paymentStarting = true;
    this.setState({ loading: true });
    try {
      const { importActions, rootDocument: { id }, paymentControlPath, path } = this.props;
      const result = await importActions.getPaymentInfo(id, {
        paymentControlPath,
        extraData: { returnPath: window.location.pathname + window.location.search + window.location.hash },
      });
      if (!result) return;
      await this.parseResult(result as { data?: unknown });
      if (this.state.isSuccess) return;
      const { requestUrl, url } = this.state.paymentRequestData || {};
      if (requestUrl) {
        const form = document.getElementById(path.join('-') + '-form') as HTMLFormElement | null;
        form?.submit();
      } else if (url) {
        window.location.href = url;
      }
    } finally {
      this.paymentStarting = false;
      this.setState({ loading: false });
    }
  };

  renderLiqPayForm = () => {
    const { path } = this.props;
    const { paymentRequestData } = this.state;

    if (!paymentRequestData) return null;

    const { requestUrl, body, requestMethod } = paymentRequestData;

    if (!requestUrl) return null;

    const formId = path.join('-') + '-form';

    const { data, signature } = qs.parse(body as string) as { data?: string; signature?: string };

    return (
      <>
        <form
          id={formId}
          method={requestMethod}
          action={requestUrl}
          {...({ 'accept-charset': 'utf-8' } as Record<string, unknown>)}
        >
          <input type="hidden" name="data" value={data} />
          <input type="hidden" name="signature" value={signature} />
        </form>
      </>
    );
  };

  checkPaymentStatus = async (props?: { silent?: boolean }) => {
    const {
      importActions,
      rootDocument: { id },
    } = this.props;
    const silent = props?.silent || false;

    this.setState({ loading: true });

    const result = await importActions.getPaymentStatus(id);

    result && (await this.parseResult(result));

    this.setState({ loading: false });

    const { isSuccess, paymentFailed } = this.state;

    // `parseResult` already dispatched 'ErrorPaymentStatus' for a terminal failure - don't also
    // tell the user it's merely pending.
    if (!isSuccess && !paymentFailed && !silent) {
      importActions.addMessage(new Message('PendingPaymentStatus', 'warning'));
    }
  };

  parseResult = async (result: { data?: unknown }) => {
    const { value, taskId, importActions, paymentControlPath } = this.props;

    if (!paymentControlPath) return;

    const dataPath = paymentControlPath.replace(/properties./g, '');

    const paymentInfo = objectPath.get(result.data, dataPath) as {
      processed?: Array<{ status: { isSuccess?: boolean; isPending?: boolean }; transactionId?: string | number }>;
      calculated: { amount: number | Array<{ amount: number }>; paymentRequestData: PaymentRequestData };
    } | undefined;

    if (!paymentInfo) return;

    const {
      processed,
      calculated: { amount, paymentRequestData },
    } = paymentInfo;
    const paymentValue = Array.isArray(amount)
      ? amount.reduce((sum, item) => sum + item.amount, 0)
      : amount;

    const hasProcessed =
      typeof processed !== 'undefined' && processed.length > 0;

    const lastProcessed = hasProcessed ? processed[processed.length - 1] : undefined;

    const successfulPayment = processed?.find((entry) => entry.status?.isSuccess);
    const isSuccess = this.state.isSuccess || !!successfulPayment;

    // A terminal (processed) attempt that did not succeed - as opposed to no attempt having
    // completed yet, which is a normal pending state, not a failure.
    const paymentFailed = hasProcessed && !isSuccess && !lastProcessed?.status.isPending;

    const alreadyPassed =
      (typeof value?.processed !== 'undefined' &&
        !!value.processed[value.processed.length - 1].status.isSuccess) ||
      false;

    isSuccess && !alreadyPassed && (await importActions.loadTask(taskId));

    // `parseResult` can be called several times for the same underlying attempt (e.g.
    // `checkPaymentStatus` followed by `initPayment` on the same mount, since a rejected attempt's
    // `processed` entry doesn't change until the provider's webhook lands). Keying the "already
    // shown" guard by the attempt's own `transactionId` - rather than a one-shot boolean - means a
    // toast fires exactly once per distinct attempt, however many times its result is parsed, with
    // no need to manually reset the guard when a new attempt starts.
    const lastProcessedTransactionId = successfulPayment?.transactionId ?? lastProcessed?.transactionId ?? null;

    if (isSuccess) {
      this.setState((prevState) => {
        if (prevState.successShownForTransactionId === lastProcessedTransactionId) return null;
        importActions.addMessage(new Message('SuccessPaymentStatus', 'success'));
        return { successShownForTransactionId: lastProcessedTransactionId };
      });
    }

    if (paymentFailed) {
      this.setState((prevState) => {
        if (prevState.failureShownForTransactionId === lastProcessedTransactionId) return null;
        importActions.addMessage(new Message('ErrorPaymentStatus', 'error'));
        return { failureShownForTransactionId: lastProcessedTransactionId };
      });
    }

    await new Promise<void>((resolve) => this.setState({
      paymentValue: paymentValue && Number(paymentValue).toFixed(2),
      paymentRequestData,
      isSuccess,
      paymentFailed,
    }, resolve));
  };

  sendPhone = async () => {
    const { phone } = this.state;

    if (phone.length < 12) {
      this.setState({ phoneNotValid: true });
      return;
    }

    this.setState({ loading: true, phoneNotValid: false });

    const {
      importActions,
      rootDocument: { id },
      paymentControlPath,
    } = this.props;

    const result = await importActions.getPaymentInfo(id, {
      paymentControlPath,
      extraData: { phone },
    });

    result && this.setState({ phoneExists: true });

    this.setState({ loading: false });
  };

  sendCode = async () => {
    const { code } = this.state;

    if (!code.length) {
      this.setState({ codeNotValid: true });
      return;
    }

    this.setState({
      loading: true,
      codeNotValid: false,
    });

    const {
      importActions,
      rootDocument: { id },
      paymentControlPath,
    } = this.props;

    const { isConfirmed } = await importActions.confirmSmsCode({
      paymentControlPath,
      documentId: id,
      code,
    });

    if (!isConfirmed) {
      importActions.addMessage(new Message('PaymentCheckCode', 'warning'));
      this.setState({ loading: false });
      return;
    }

    await awaitDelay(500);

    const result = await importActions.getPaymentStatus(id);

    result && (await this.parseResult(result));

    this.setState({
      loading: false,
      isConfirmed,
    });

    const { isSuccess, paymentFailed } = this.state;

    // `parseResult` already dispatched 'ErrorPaymentStatus' for a terminal failure - don't also
    // tell the user it's merely pending.
    !isSuccess &&
      !paymentFailed &&
      importActions.addMessage(new Message('PendingPaymentStatus', 'warning'));
  };

  resendCode = () => this.setState({ phoneExists: false });

  initPayment = async () => {
    const {
      importActions,
      rootDocument: { id },
      paymentControlPath,
      paymentType,
      taskId,
      withRedirect,
      value,
    } = this.props;
    const { loadingValue, paymentRequestData, paymentValue } = this.state;

    if (loadingValue) return;

    const hasInitialized =
      !!value?.calculated &&
      !!(paymentRequestData?.requestUrl || paymentRequestData?.url) &&
      paymentValue === this.getAmount();

    if (hasInitialized) return;

    this.setState({ loadingValue: true });

    if (paymentType === 'phone') {
      const result = await importActions.getPaymentStatus(id);
      result && (await this.parseResult(result));
    } else {
      if (withRedirect) {
        const result = await importActions.getPaymentStatus(id);
        result && (await this.parseResult(result));
      }

      const { isSuccess } = this.state;

      if (!isSuccess) {
        const res = await importActions.getPaymentInfo(id, {
          paymentControlPath,
          extraData: {
            returnPath: window.location.pathname + window.location.search + window.location.hash,
          },
        });

        const failed = typeof res === 'undefined';

        this.setState({ failed });

        res && this.parseResult(res as { data?: unknown });
      }
    }

    await importActions.loadTask(taskId);

    this.setState({ loadingValue: false, inited: true });
  };

  getAmount = (): string => {
    const { recipients, rootDocument } = this.props;

    const countSum = ([] as Array<{ amount: string }>)
      .concat(recipients as { amount: string })
      .map(({ amount }) => {
        const result = evaluate(amount, rootDocument.data);

        if (result instanceof Error) return 0;

        return result as number;
      })
      .reduce((a, b) => a + b, 0);

    return countSum.toFixed(2);
  };

  init = async () => {
    await this.checkPaymentStatus({ silent: true });
    // Awaited so `processList`'s in-flight dedup entry for this control stays held for the whole
    // init cycle - otherwise it clears as soon as `checkPaymentStatus` resolves, and the
    // `loadingValue`/`inited` state change at the end of `initPayment` can trigger
    // `componentDidUpdate` to schedule a second, overlapping `init` call.
    await this.initPayment();
  };

  componentDidUpdate = (_: unknown, prevState: PaymentState) => {
    const { hidden, paymentType, paymentControlPath } = this.props;
    const { paymentRequestData, loadingValue, failed } = this.state;

    if (hidden || paymentRequestData || paymentType === 'phone') return;
    if (loadingValue && loadingValue === prevState.loadingValue) return;
    if (failed) return;

    waiter.addAction(
      'fetch_interface_data',
      () => {
        processList.hasOrSet(`${paymentControlPath}_init`, this.init);
      },
      250,
    );
  };

  componentDidMount = () => {
    const { hidden, paymentControlPath } = this.props;

    if (hidden) return;

    processList.hasOrSet(`${paymentControlPath}_init`, this.init);
  };

  render = () => {
    const { paymentType, hidden, readOnly, schema, commitAfterPayment, t } = this.props;
    const { isSuccess, paymentFailed } = this.state;
    const { jsonSchema, rootPath, task, taskId } = this.props;
    const properties = { ...this.props, ...this.state } as unknown as Record<string, unknown>;
    const { disabledText = '' } = schema || {};
    const error = paymentFailed && !isSuccess ? { message: t('PaymentError') } : properties?.error;

    if (hidden) return null;

    if (commitAfterPayment && isSuccess && task.finished) {
      return (
        <SuccessMessage
          {...jsonSchema}
          taskId={taskId}
          rootPath={rootPath}
          task={task}
        />
      );
    }

    return (
      <>
        {readOnly ? (
          <div style={{ marginBottom: '10px' }}>{renderHTML(disabledText)}</div>
        ) : (
          <ElementContainer
            sample={properties?.sample as string}
            description={properties?.description as string}
            variant={properties?.variant as never}
            required={properties?.required as boolean}
            error={error}
            bottomSample={true}
            className={(properties?.classes as { groupWrapper?: string })?.groupWrapper}
            noMargin={properties?.noMargin as boolean}
          >
            {paymentType === 'phone' && (
              <PhoneLayout
                {...properties}
                onChangePhone={this.onChangePhone}
                onChangeCode={this.onChangeCode}
                sendPhone={this.sendPhone}
                sendCode={this.sendCode}
                resendCode={this.resendCode}
                checkPaymentStatus={this.checkPaymentStatus}
              />
            )}
            {paymentType === 'QR' && (
              <QrLayout
                {...properties}
                checkPaymentStatus={this.checkPaymentStatus}
              />
            )}
            {!paymentType && (
              <>
                <PaymentLayout
                  {...properties}
                  paymentAction={this.paymentAction}
                />
                {this.renderLiqPayForm()}
              </>
            )}
          </ElementContainer>
        )}
      </>
    );
  };
}

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  importActions: {
    getPaymentInfo: bindActionCreators(getPaymentInfo, dispatch),
    getPaymentStatus: bindActionCreators(getPaymentStatus, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
    loadTask: bindActionCreators(loadTask, dispatch),
    confirmSmsCode: bindActionCreators(confirmSmsCode, dispatch),
  } as unknown as ImportActions,
});

const translated = translate('Elements')(Payment);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
