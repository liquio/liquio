import React from 'react';
import PropTypes from 'prop-types';
import setComponentsId from 'helpers/setComponentsId';
import { Link } from 'react-router-dom';
import { translate } from 'react-translate';
import theme from 'themes';
import Ajv from 'ajv';
import { FormControl, FormLabel, TextField, FormControlLabel, Checkbox, Button, Typography, Toolbar } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import { fourteenYearsAgo, today } from 'helpers/humanDateFormat';
import normalizeErrors from 'helpers/normalizeErrors';
import CustomDatePicker from 'components/CustomInput/CustomDatePicker';
import style from 'assets/jss';
import { legalSchema, personSchema } from 'variables/validateSchemas';
import { ReactComponent as EditIcon } from 'assets/img/edit_icon.svg';
import PhoneInput from './PhoneInput';
import EmailInput from './EmailInput';
import { getConfig } from 'helpers/configLoader';
import classNames from 'classnames';

const ajv = new Ajv({ ownProperties: true, allErrors: true });

const RegisterForm = (props) => {
  const { classes, t, setId, onSubmit } = props;
  const config = getConfig();
  const { SHOW_PHONE, EMAIL_OPTIONAL } = config;

  const [errors, setErrors] = React.useState(props.errors);
  const [activeStep, setActiveStep] = React.useState(0);
  const [values, setValues] = React.useState({
    ...(props.values || {}),
    agreement: theme.hideTermsLink,
  });

  const { isLegal, agreement, ipn, last_name, first_name, middle_name, phone, email, legalEntityDateRegistration, birthday } = React.useMemo(
    () => values,
    [values],
  );

  const handleChange = React.useCallback(
    (name) =>
      ({ target: { value } }, callback) => {
        setValues((s) => ({
          ...s,
          [name]: value,
        }));

        setErrors((e) => ({
          ...e,
          [name]: null,
        }));

        callback && callback();
      },
    [],
  );

  const handleCheck = React.useCallback(
    (name) =>
      ({ target: { checked } }) =>
        handleChange(name)({ target: { value: checked } }),
    [handleChange],
  );

  const onDateChange = React.useCallback((name) => (date) => handleChange(name)({ target: { value: date } }), [handleChange]);

  const handleSubmit = React.useCallback(
    (e) => {
      e.preventDefault();

      const validator = ajv.compile(isLegal ? legalSchema : personSchema);

      validator(values);

      const errors = normalizeErrors(validator.errors || [], t);

      if (!SHOW_PHONE) delete errors.phone;
      if (EMAIL_OPTIONAL) delete errors.email;

      setErrors(errors);

      if (!Object.keys(errors).length) {
        onSubmit && onSubmit(values);
      }
    },
    [values, onSubmit, t],
  );

  const handleDiscard = React.useCallback(() => {
    window.location.href = '/logout';
  }, []);

  const renderTextField = React.useCallback(
    (name, rest) => {
      return (
        <TextField
          variant="standard"
          {...rest}
          name={name}
          error={!!(errors || {})[name]}
          helperText={(errors || {})[name] || ''}
          label={t(name.toUpperCase() + '_INPUT_LABEL')}
          value={(values || '')[name] || ''}
          onChange={handleChange(name)}
          className={classes.textField}
        />
      );
    },
    [errors, values, handleChange, classes, t],
  );

  const renderName = React.useCallback(() => {
    return (
      <TextField
        variant="standard"
        label={t('NAME_INPUT_LABEL')}
        disabled={true}
        value={`${last_name || ''} ${first_name || ''} ${middle_name || ''}`}
        margin="normal"
        className={classes.textField}
      />
    );
  }, [last_name, first_name, middle_name, classes, t]);

  const renderPhoneField = React.useCallback(
    (props) => {
      return (
        <PhoneInput
          name="phone"
          error={(errors || {}).phone}
          label={t('PHONE_INPUT_LABEL')}
          value={phone || ''}
          onChange={handleChange('phone')}
          onCodeChange={handleChange('code_phone')}
          setId={(elementName) => setId(`phone-${elementName}`)}
          className={classes.textField}
          {...props}
        />
      );
    },
    [phone, errors, handleChange, setId, classes, t],
  );

  const renderEmailField = React.useCallback(
    (props) => {
      return (
        <EmailInput
          name="email"
          error={(errors || {}).email}
          label={t('EMAIL_INPUT_LABEL')}
          value={email || ''}
          onChange={handleChange('email')}
          onCodeChange={handleChange('code_email')}
          setId={(elementName) => setId(`email-${elementName}`)}
          className={classes.textField}
          {...props}
        />
      );
    },
    [email, errors, handleChange, setId, classes, t],
  );

  const renderLegalDateRegistrationField = React.useCallback(
    (props) => {
      return (
        <CustomDatePicker
          name="birthday"
          error={(errors || {}).legalEntityDateRegistration}
          label={t('REG_DATE_INPUT_LABEL')}
          onChange={onDateChange('legalEntityDateRegistration')}
          value={legalEntityDateRegistration || ''}
          maxDate={today()}
          setId={(elementName) => setId(`legalEntityDateRegistration-${elementName}`)}
          handleNextStep={() => setActiveStep(activeStep + 1)}
          {...props}
        />
      );
    },
    [legalEntityDateRegistration, errors, handleChange, setId, classes, setActiveStep, activeStep, t],
  );

  const renderBirthdayField = React.useCallback(() => {
    return (
      <CustomDatePicker
        name="birthday"
        error={(errors || {}).birthday}
        label={t('BIRTHDAY_INPUT_LABEL')}
        onChange={onDateChange('birthday')}
        value={birthday || ''}
        maxDate={fourteenYearsAgo()}
        setId={(elementName) => setId(`birthday-${elementName}`)}
        handleNextStep={() => setActiveStep(activeStep + 1)}
        {...props}
      />
    );
  }, [birthday, errors, handleChange, setId, classes, setActiveStep, activeStep, t]);

  const renderCheckboxField = React.useCallback(
    (name) => {
      return (
        <FormControlLabel
          control={<Checkbox checked={!!(values || '')[name]} onChange={handleCheck(name)} color="primary" />}
          label={t(name.toUpperCase() + '_INPUT_LABEL')}
        />
      );
    },
    [values, handleCheck, t],
  );

  const getUserSteps = React.useCallback(() => {
    const steps = [
      {
        label: t('REGISTER_STEP_1'),
        id: 'name',
        optional: (
          <>
            <Typography variant="caption">
              <span className={classes.stepNumber}></span>
              {`${last_name || ''} ${first_name || ''} ${middle_name || ''}`}
              {', '}
              {ipn}
            </Typography>
          </>
        ),
        description: () => (
          <>
            <div className={classes.flexColumnWrapper}>
              {renderName()}

              {renderTextField('ipn', {
                disabled: true,
                className: classes.ipn,
              })}
            </div>
            <Button
              variant="contained"
              onClick={() => setActiveStep(activeStep + 1)}
              aria-label={t('ACCEPT')}
              setId={(elementName) => setId(`accept-step-button-${elementName}`)}
            >
              {t('ACCEPT')}
            </Button>
          </>
        ),
      },
    ];

    if (theme.useBirthday) {
      steps.push({
        label: t('REGISTER_STEP_4'),
        id: 'birthday',
        optional: (
          <>
            <Typography variant="caption">
              <span className={classes.stepNumber}></span>
            </Typography>
          </>
        ),
        description: (props) => <>{renderBirthdayField(props)}</>,
      });
    }

    if (!theme?.hiddenEmail) {
      steps.push({
        label: t('REGISTER_STEP_2'),
        id: 'email',
        optional: (
          <>
            <Typography variant="caption">
              <span className={classes.stepNumber}></span>
              {email}
            </Typography>
          </>
        ),
        description: (props) => <>{renderEmailField(props)}</>,
      });
    }

    if (SHOW_PHONE) {
      steps.push({
        label: t('REGISTER_STEP_3'),
        id: 'phone',
        optional: (
          <>
            <Typography variant="caption">
              <span className={classes.stepNumber}></span>
              {phone}
            </Typography>
          </>
        ),
        description: (props) => <>{renderPhoneField(props)}</>,
      });
    }

    return steps;
  }, [t, classes, activeStep, SHOW_PHONE, phone, email, renderName, renderEmailField, renderPhoneField, renderBirthdayField]);

  const getLegalSteps = React.useCallback(() => {
    const steps = [
      {
        label: t('REGISTER_LEGAL_STEP_1'),
        id: 'companyName',
        description: () => (
          <>
            {renderTextField('companyName', { disabled: true })}
            {renderTextField('edrpou', { disabled: true })}
            <Button
              variant="contained"
              onClick={() => setActiveStep(activeStep + 1)}
              aria-label={t('ACCEPT')}
              setId={(elementName) => setId(`accept-step-button-${elementName}`)}
            >
              {t('ACCEPT')}
            </Button>
          </>
        ),
      },
    ];

    if (theme.useDateRegistration) {
      steps.push({
        label: t('REGISTER_LEGAL_STEP_2'),
        id: 'dateRegistration',
        description: (props) => <>{renderLegalDateRegistrationField(props)}</>,
      });
    }

    steps.push({
      label: t('REGISTER_LEGAL_STEP_3'),
      id: 'email',
      description: (props) => <>{renderEmailField(props)}</>,
    });

    steps.push({
      label: t('REGISTER_LEGAL_STEP_4'),
      id: 'phone',
      description: (props) => <>{renderPhoneField(props)}</>,
    });

    return steps;
  }, []);

  const userSteps = React.useMemo(() => getUserSteps(), [getUserSteps]);

  const legalSteps = React.useMemo(() => getLegalSteps(), [getLegalSteps]);

  const steps = React.useMemo(() => (isLegal ? legalSteps : userSteps), [isLegal, legalSteps, userSteps]);

  const renderForm = React.useCallback(() => {
    return (
      <>
        <Typography variant="h1" className={classes.mainHeadline}>
          {t('REGISTER_TITLE')}
        </Typography>

        <Stepper
          activeStep={activeStep}
          orientation="vertical"
          connector={false}
          classes={{
            root: classes.stepperRoot,
          }}
        >
          {steps.map((step, index) => (
            <Step
              key={step.label}
              completed={false}
              classes={{
                root: classNames({
                  [classes.stepRoot]: true,
                  [classes.stepRootError]: errors[step.id],
                }),
              }}
            >
              <StepLabel
                classes={{
                  label: classes.stepLabel,
                  iconContainer: classes.stepIconContainer,
                }}
                optional={step.optional}
              >
                <span>
                  <span className={classes.stepNumber}>{index + 1}.</span>
                  {step.label}
                </span>

                {index < activeStep && step?.id !== 'name' && (
                  <Button
                    variant="text"
                    onClick={() => setActiveStep(index)}
                    aria-label={t('EDIT')}
                    className={classes.editStepButton}
                    startIcon={<EditIcon />}
                  >
                    {t('EDIT')}
                  </Button>
                )}
              </StepLabel>
              <StepContent
                classes={{
                  root: classNames({
                    [classes.stepContentRoot]: true,
                    [classes.stepContentRootCustom]: index > 0,
                  }),
                }}
              >
                <div>{<step.description handleNextStep={() => setActiveStep(index + 1)} />}</div>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </>
    );
  }, [activeStep, steps, renderTextField, renderName, renderEmailField, renderPhoneField, renderBirthdayField, renderCheckboxField, t, classes]);

  return (
    <>
      <FormControl variant="standard" fullWidth={true} className={classes.formControl} id={setId('')}>
        {renderForm()}
      </FormControl>

      {activeStep === steps.length && (
        <>
          <FormControl
            variant="standard"
            required={true}
            error={errors.agreement}
            component="fieldset"
            className={[classes.formControl, classes.formControlAgreement]}
            id={setId('control-agreement')}
          >
            {theme.hideTermsLink ? null : (
              <FormControlLabel
                control={
                  <Checkbox color="primary" checked={agreement || false} onChange={handleCheck('agreement')} id={setId('checkbox-agreement')} />
                }
                label={t('AGREEMENT_TEXT', {
                  link: (
                    <Link to="/terms" target="_blank" id={setId('link-to-terms')}>
                      {t('TERMS_LINK')}
                    </Link>
                  ),
                })}
              />
            )}
            {!!errors.agreement && <FormLabel id={setId('label-agreement')}>{t('AGREEMENT_REQUIRED')}</FormLabel>}
          </FormControl>
          {theme.useIndividualEntrepreneur && renderCheckboxField('isIndividualEntrepreneur')}
        </>
      )}

      <Toolbar
        classes={{
          root: classes.toolbarRoot,
        }}
      >
        {activeStep === steps.length && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            id={setId('activate-button')}
            setId={(elementName) => setId(`activate-button-${elementName}`)}
            aria-label={t('ACTIVATE')}
          >
            {t('ACTIVATE')}
          </Button>
        )}
        <Button
          onClick={handleDiscard}
          color="inherit"
          variant={theme.discardOutlined ? 'outlined' : 'text'}
          id={setId('discard-button')}
          setId={(elementName) => setId(`discard-button-${elementName}`)}
          aria-label={t('DISCARD')}
          sx={{ ml: 1, mb: 1 }}
        >
          {t('DISCARD')}
        </Button>
      </Toolbar>
    </>
  );
};

RegisterForm.propTypes = {
  setId: PropTypes.func,
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  errors: PropTypes.object,
  values: PropTypes.object,
  onSubmit: PropTypes.func,
};

RegisterForm.defaultProps = {
  setId: setComponentsId('left-side-bar'),
  errors: {},
  values: {},
  onSubmit: undefined,
};

const styled = withStyles(style)(RegisterForm);

const translated = translate('RegisterForm')(styled);

export default translated;
