/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
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

const awaitDelay = (delay) =>
  new Promise((fulfill) => {
    setTimeout(fulfill, delay);
  });

class Payment extends React.Component {
  constructor(props) {
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
      successMessageShown: false,
    };
  }

  onChangePhone = (value) => this.setState({ phone: value });

  onChangeCode = (value) => this.setState({ code: value });

  paymentAction = () => {
    const { path } = this.props;
    const {
      paymentRequestData: { requestUrl, url },
    } = this.state;

    if (requestUrl) {
      const formId = path.join('-') + '-form';
      const form = document.getElementById(formId);
      form.submit();
      return;
    }

    if (url) {
      window.location.href = url;
    }
  };

  renderLiqPayForm = () => {
    const { path } = this.props;
    const { paymentRequestData } = this.state;

    if (!paymentRequestData) return null;

    const { requestUrl, body, requestMethod } = paymentRequestData;

    if (!requestUrl) return null;

    const formId = path.join('-') + '-form';

    const { data, signature } = qs.parse(body);

    return (
      <>
        <form
          id={formId}
          method={requestMethod}
          action={requestUrl}
          accept-charset="utf-8"
        >
          <input type="hidden" name="data" value={data} />
          <input type="hidden" name="signature" value={signature} />
        </form>
      </>
    );
  };

  checkPaymentStatus = async (props) => {
    const {
      importActions,
      rootDocument: { id },
    } = this.props;
    const silent = props?.silent || false;

    this.setState({ loading: true });

    const result = await importActions.getPaymentStatus(id);

    result && (await this.parseResult(result));

    this.setState({ loading: false });

    const { isSuccess } = this.state;

    if (!isSuccess && !silent) {
      importActions.addMessage(new Message('PendingPaymentStatus', 'warning'));
    }
  };

  parseResult = async (result) => {
    const { value, taskId, importActions, paymentControlPath } = this.props;

    if (!paymentControlPath) return;

    const dataPath = paymentControlPath.replace(/properties./g, '');

    const paymentInfo = objectPath.get(result.data, dataPath);

    if (!paymentInfo) return;

    const {
      processed,
      calculated: { amount, paymentRequestData },
    } = paymentInfo;
    const paymentValue = Array.isArray(amount)
      ? amount.reduce((sum, item) => sum + item.amount, 0)
      : amount;

    const isSuccess =
      (typeof processed !== 'undefined' &&
        !!processed[processed.length - 1].status.isSuccess) ||
      false;

    const alreadyPassed =
      (typeof value.processed !== 'undefined' &&
        !!value.processed[value.processed.length - 1].status.isSuccess) ||
      false;

    isSuccess && !alreadyPassed && (await importActions.loadTask(taskId));

    if (isSuccess && !this.state.successMessageShown) {
      importActions.addMessage(new Message('SuccessPaymentStatus', 'success'));
      this.setState({ successMessageShown: true });
    }

    this.setState({
      paymentValue: paymentValue && paymentValue.toFixed(2),
      paymentRequestData,
      isSuccess,
    });
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

    const { isSuccess } = this.state;

    !isSuccess &&
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
      !!paymentRequestData?.requestUrl &&
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
        });

        const failed = typeof res === 'undefined';

        this.setState({ failed });

        res && this.parseResult(res);
      }
    }

    await importActions.loadTask(taskId);

    this.setState({ loadingValue: false, inited: true });
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

    return countSum.toFixed(2);
  };

  init = async () => {
    await this.checkPaymentStatus({ silent: true });
    this.initPayment();
  };

  componentDidUpdate = (_, prevState) => {
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
    const { paymentType, hidden, readOnly, schema, commitAfterPayment } = this.props;
    const { isSuccess } = this.state;
    const { jsonSchema, rootPath, task, taskId } = this.props;
    const properties = { ...this.props, ...this.state };
    const { disabledText = '' } = schema || {};

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
            sample={properties?.sample}
            description={properties?.description}
            variant={properties?.variant}
            required={properties?.required}
            error={properties?.error}
            bottomSample={true}
            className={properties?.classes?.groupWrapper}
            noMargin={properties?.noMargin}
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

Payment.propTypes = {
  importActions: PropTypes.object.isRequired,
  value: PropTypes.object,
  rootDocument: PropTypes.object.isRequired,
  paymentControlPath: PropTypes.string.isRequired,
  paymentType: PropTypes.string,
  hidden: PropTypes.bool,
  taskId: PropTypes.string.isRequired,
  withRedirect: PropTypes.bool,
};

Payment.defaultProps = {
  paymentType: null,
  value: {},
  hidden: false,
  withRedirect: false,
};

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  importActions: {
    getPaymentInfo: bindActionCreators(getPaymentInfo, dispatch),
    getPaymentStatus: bindActionCreators(getPaymentStatus, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
    loadTask: bindActionCreators(loadTask, dispatch),
    confirmSmsCode: bindActionCreators(confirmSmsCode, dispatch),
  },
});

const translated = translate('Elements')(Payment);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
