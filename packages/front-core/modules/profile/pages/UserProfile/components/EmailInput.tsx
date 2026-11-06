import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import {
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Typography,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import BorderColorRoundedIcon from '@mui/icons-material/BorderColorRounded';
import { bindActionCreators, Dispatch } from 'redux';
import { sendEmailCode, verifyEmailCode, checkEmail } from 'actions/auth';
import StringElement from 'components/JsonSchema/elements/StringElement';
import { EJVError } from 'components/JsonSchema';
import customInputStyle from './styles';
import { ReactComponent as SuccessIllustration } from 'assets/img/successIllustration.svg';
import moment from 'moment';
import padWithZeroes from 'helpers/padWithZeroes';
import IntervalUpdateComponent from 'components/IntervalUpdateComponent';

const mailInspection =
  /[A-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-z0-9!#$%&'*+/=?^_`{|}~-]+)*@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const regexDomain =
  /^(?!.*@(mail\.ua|ya\.ua|yandex\.ua|rambler\.ua|.*\.ru|.*\.su)$).+$/i;

interface EmailInputProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  classes: Record<string, string>;
  onChange: (event: { target: { name: string; value: unknown } }) => void;
  value?: string;
  handleSave: () => void;
  actions: {
    sendEmailCode: (email: string) => Promise<void>;
    verifyEmailCode: (email: string, code: string) => Promise<{ isAccepted?: boolean }>;
    checkEmail: (email: string) => Promise<{ isExist?: boolean; isAllowed?: boolean }>;
  };
}

interface EmailInputState {
  showModal: boolean;
  codeSended: boolean;
  email: string;
  code: string;
  error: Error | null;
  resendClicked: boolean;
  verificationSuccess: boolean;
  timer: number | null;
}

class EmailInput extends React.Component<EmailInputProps, EmailInputState> {
  static defaultProps = {
    value: '',
  };

  state: EmailInputState = {
    showModal: false,
    codeSended: false,
    email: '',
    code: '',
    error: null,
    resendClicked: false,
    verificationSuccess: false,
    timer: null,
  };

  toggleModal = () =>
    this.setState({
      showModal: !this.state.showModal,
      codeSended: false,
      error: null,
      code: '',
      resendClicked: false,
      verificationSuccess: false,
      timer: null,
    });

  onChangeCode = ({ target: { value } }: { target: { value: string } }) =>
    this.setState({
      code: value,
      error: this.state.code.length > 0 ? null : this.state.error,
    });

  onChangeEmail = (value: string) => {
    const { t, value: propValue, actions } = this.props;
    const test = mailInspection.test(value);
    const testDomain = regexDomain.test(value);

    let error: Error | null = null;

    if (!test) {
      error = new Error(t('EmailError'));
    } else if (!testDomain) {
      error = new Error(t('EmailDomainError'));
    }
    if (!error) {
      if (propValue === value) {
        this.setState({
          email: value,
          error: new Error(t('NotChangeEmailError')),
        });
      } else {
        this.setState({ email: value }, async () => {
          const { isExist, isAllowed } = await actions.checkEmail(value);
          if (isExist) {
            error = new Error(t('DuplicateEmailError'));
          } else if (isAllowed === false) {
            error = new Error(t('EmailNotAuthorized'));
          }

          this.setState({ error });
        });
      }
    } else {
      this.setState({ email: value, error });
    }
    return error;
  };

  sendEmailCode = () => {
    const { actions } = this.props;
    const { email } = this.state;
    const error = this.onChangeEmail(email);
    if (!error) {
      this.setState({ codeSended: true, timer: new Date().getTime() }, () =>
        actions.sendEmailCode(email),
      );
    }
  };

  moreSendEmail = () => {
    const { actions } = this.props;
    this.setState({ resendClicked: true, timer: new Date().getTime() });
    this.state.error
      ? this.setState({ codeSended: false, error: null, resendClicked: false })
      : actions
          .sendEmailCode(this.state.email)
          .finally(() => this.setState({ resendClicked: false }));
  };

  verifyEmailCode = async () => {
    const { t, onChange, actions, handleSave } = this.props;
    const { code, email } = this.state;
    try {
      const result = await actions.verifyEmailCode(email, code);
      if (!result.isAccepted) {
        throw new Error(t('ValidationFalse'));
      }
      this.setState({
        codeSended: false,
        email: '',
        code: '',
        verificationSuccess: true,
      });
      onChange({ target: { name: 'email', value: email } });
      handleSave();
    } catch (e) {
      void e;
      this.setState({ error: new Error(t('ValidationFalse')) });
    }
  };

  renderCountDown = () => {
    const { t, classes } = this.props;
    const { timer } = this.state;

    const timeDelta = moment(timer as number).add(60, 'seconds').diff(moment());
    const duration = moment.duration(timeDelta);

    if (duration.asSeconds() < 0) {
      return (
        <Typography
          style={{
            marginTop: '8px',
          }}
          className={classes.linkButton}
          onClick={this.moreSendEmail}
        >
          {t('ResendCode')}
        </Typography>
      );
    }

    return (
      <Typography variant="body1" className={classes.wait}>
        {t('SendAnotherCodeCounDown', {
          counter: [
            duration.minutes(),
            padWithZeroes(duration.seconds(), 2),
          ].join(':'),
        })}
      </Typography>
    );
  };

  render() {
    const { showModal, codeSended, error, code, email, verificationSuccess } =
      this.state;
    const { t, value, classes } = this.props;
    const disabledButton = !!error || (codeSended ? !code : !email);

    return (
      <Fragment>
        <TextField
          variant="standard"
          disabled={true}
          name="email"
          label={t('EmailInputLabel')}
          value={value || ''}
          margin="dense"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={this.toggleModal}>
                  <BorderColorRoundedIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        {showModal ? (
          <Dialog
            open={showModal}
            onClose={this.toggleModal}
            className={classes.dialog}
          >
            {!verificationSuccess ? (
              <DialogTitle className={classes.dialogContentWrappers}>
                {t('EmailDialogTitle')}
              </DialogTitle>
            ) : null}
            {verificationSuccess ? (
              <DialogContent
                className={classes.dialogContentWrappersSuccess}
                style={{ textAlign: 'center' }}
              >
                <SuccessIllustration />
                <Typography
                  variant="h2"
                  className={classes.successTittle}
                  gutterBottom
                >
                  {t('SuccessTitle')}
                </Typography>
                <Typography
                  variant="h6"
                  className={classes.successText}
                  gutterBottom
                >
                  {t('SuccessMessage')}
                </Typography>
                <Button
                  onClick={this.toggleModal}
                  variant="contained"
                  color="primary"
                >
                  {t('GoToProfile')}
                </Button>
              </DialogContent>
            ) : (
              <DialogContent className={classes.dialogContentWrappers}>
                <DialogContentText>
                  {codeSended
                    ? t('TextWaitForCode', { email })
                    : t('EmailDialogText')}
                </DialogContentText>
                <FormControl
                  variant="standard"
                  fullWidth={true}
                  className={classes.formControl}
                  margin="dense"
                >
                  {codeSended ? (
                    <>
                      <Typography
                        className={classes.codeInputDescription}
                        variant="body2"
                        color="textSecondary"
                      >
                        {t('CodeInputDescription')}
                      </Typography>
                      <TextField
                        variant="standard"
                        placeholder={t('CodeInputLabel')}
                        value={code}
                        helperText={error ? <EJVError error={error as never} /> : null}
                        error={!!error}
                        onChange={this.onChangeCode}
                      />
                      <IntervalUpdateComponent render={this.renderCountDown} />
                    </>
                  ) : (
                    <StringElement
                      placeholder={t('EmailInputLabel')}
                      description={t('EmailInputLabel')}
                      value={email}
                      error={error as never}
                      maxLength={255}
                      onChange={this.onChangeEmail as never}
                      required={true}
                      noMargin={true}
                    />
                  )}
                </FormControl>
                <Button
                  onClick={
                    codeSended ? this.verifyEmailCode : this.sendEmailCode
                  }
                  variant="contained"
                  color="primary"
                  disabled={disabledButton}
                  autoFocus={true}
                >
                  {codeSended ? t('VerifyCode') : t('SendCode')}
                </Button>
              </DialogContent>
            )}
          </Dialog>
        ) : null}
      </Fragment>
    );
  }
}

const styled = withStyles(customInputStyle)(EmailInput as never);
const translated = translate('UserProfile')(styled as never);

function mapStateToProps(state: { auth: Record<string, unknown> }) {
  return { auth: state.auth };
}

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    sendEmailCode: bindActionCreators(sendEmailCode, dispatch),
    verifyEmailCode: bindActionCreators(verifyEmailCode, dispatch),
    checkEmail: bindActionCreators(checkEmail, dispatch),
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
