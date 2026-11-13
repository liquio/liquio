import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import setComponentsId from 'helpers/setComponentsId';
import { Link } from 'react-router-dom';
import { translate } from 'react-translate';
import type { Translate } from 'react-translate';
import theme from 'themes';
import Ajv from 'ajv';
import { FormControl, FormLabel, TextField, FormControlLabel, Checkbox, Button, Typography, Toolbar } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import type { Styles } from '@mui/styles/withStyles';
import type { Theme } from '@mui/material/styles';
import type { Dayjs } from 'dayjs';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import { fourteenYearsAgo, today } from 'helpers/humanDateFormat';
import normalizeErrors from 'helpers/normalizeErrors';
import type { ValidationError } from 'helpers/normalizeErrors';
import CustomDatePicker from 'components/CustomInput/CustomDatePicker';
import style from 'assets/jss';
import { legalSchema, personSchema } from 'variables/validateSchemas';
import { ReactComponent as EditIcon } from 'assets/img/edit_icon.svg';
import PhoneInput from './PhoneInput';
import EmailInput from './EmailInput';
import { getConfig } from 'helpers/configLoader';
import classNames from 'classnames';

const ajv = new Ajv({ ownProperties: true, allErrors: true });

// The theme (bpmn) does not define these optional flags, but a theme may; widened by assignment.
const optionalTheme: typeof theme & {
  hideTermsLink?: boolean;
  useBirthday?: boolean;
  hiddenEmail?: boolean;
  useDateRegistration?: boolean;
  useIndividualEntrepreneur?: boolean;
  discardOutlined?: boolean;
} = theme;

// The user object from `GET /auth` (the register page's `values`), plus what the form adds.
interface FormValues {
  isLegal?: boolean;
  agreement?: boolean;
  ipn?: string;
  last_name?: string;
  first_name?: string;
  middle_name?: string;
  phone?: string;
  email?: string;
  legalEntityDateRegistration?: string;
  birthday?: string;
  [key: string]: unknown;
}

type FormErrors = Record<string, unknown>;
type SetId = (elementName: string) => string;

interface RegisterFormProps {
  t: Translate;
  classes: Record<string, string>;
  setId?: SetId;
  errors?: FormErrors;
  values?: FormValues;
  onSubmit?: (values: FormValues) => void;
}

// What a step's `description` component gets from the stepper.
interface StepContentProps {
  handleNextStep: () => void;
}

interface Step {
  label: string;
  id: string;
  optional?: ReactNode;
  description: (props: StepContentProps) => ReactElement;
}

const RegisterForm = (rawProps: RegisterFormProps) => {
  // The old `defaultProps` (a prop that is `undefined` gets the default), kept as one `props` object because
  // `renderBirthdayField` spreads all of it onto the date picker.
  const props = {
    ...rawProps,
    setId: rawProps.setId === undefined ? setComponentsId('left-side-bar') : rawProps.setId,
    errors: rawProps.errors === undefined ? {} : rawProps.errors,
    values: rawProps.values === undefined ? {} : rawProps.values,
    onSubmit: rawProps.onSubmit,
  };
  const { classes, t, setId, onSubmit } = props;
  const config = getConfig();
  const { SHOW_PHONE, EMAIL_OPTIONAL } = config;

  const [errors, setErrors] = React.useState<FormErrors>(props.errors);
  const [activeStep, setActiveStep] = React.useState(0);
  const [values, setValues] = React.useState<FormValues>({
    ...(props.values || {}),
    agreement: optionalTheme.hideTermsLink,
  });

  const { isLegal, agreement, ipn, last_name, first_name, middle_name, phone, email, legalEntityDateRegistration, birthday } = React.useMemo(
    () => values,
    [values],
  );

  const handleChange = React.useCallback(
    (name: string) =>
      ({ target: { value } }: { target: { value: unknown } }, callback?: () => void) => {
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
    (name: string) =>
      ({ target: { checked } }: { target: { checked: boolean } }) =>
        handleChange(name)({ target: { value: checked } }),
    [handleChange],
  );

  const onDateChange = React.useCallback((name: string) => (date: unknown) => handleChange(name)({ target: { value: date } }), [handleChange]);

  const handleSubmit = React.useCallback(
    (e: { preventDefault: () => void }) => {
      e.preventDefault();

      const validator = ajv.compile(isLegal ? legalSchema : personSchema);

      validator(values);

      const errors = normalizeErrors((validator.errors || []) as ValidationError[], t);

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
    (name: string, rest?: { disabled?: boolean; className?: string }) => {
      return (
        <TextField
          variant="standard"
          {...rest}
          name={name}
          error={!!(errors || {})[name]}
          helperText={((errors || {})[name] || '') as ReactNode}
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
    (props: StepContentProps) => {
      return (
        <PhoneInput
          name="phone"
          error={(errors || {}).phone as ReactNode}
          label={t('PHONE_INPUT_LABEL')}
          value={phone || ''}
          onChange={handleChange('phone')}
          onCodeChange={handleChange('code_phone')}
          setId={(elementName) => setId(`phone-${elementName}`)}
          {...props}
        />
      );
    },
    [phone, errors, handleChange, setId, classes, t],
  );

  const renderEmailField = React.useCallback(
    (props: StepContentProps) => {
      return (
        <EmailInput
          name="email"
          error={(errors || {}).email as ReactNode}
          label={t('EMAIL_INPUT_LABEL')}
          value={email || ''}
          onChange={handleChange('email')}
          onCodeChange={handleChange('code_email')}
          setId={(elementName) => setId(`email-${elementName}`)}
          {...props}
        />
      );
    },
    [email, errors, handleChange, setId, classes, t],
  );

  const renderLegalDateRegistrationField = React.useCallback(
    (props: StepContentProps) => {
      return (
        <CustomDatePicker
          name="birthday"
          // `CustomDatePicker` has no `error` prop (it is ignored); kept through an object spread.
          {...({ error: (errors || {}).legalEntityDateRegistration } as object)}
          label={t('REG_DATE_INPUT_LABEL')}
          onChange={onDateChange('legalEntityDateRegistration')}
          value={legalEntityDateRegistration || ''}
          // `today()` is a moment and the picker uses a dayjs adapter (kept, see components/CustomInput/CustomDatePicker).
          maxDate={today() as unknown as Dayjs}
          setId={(elementName) => setId(`legalEntityDateRegistration-${elementName}`)}
          // `{...props}` always carries the stepper's own `handleNextStep`, which replaced the one that used to be
          // set here (`activeStep + 1`), so that one is gone.
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
        // `CustomDatePicker` has no `error` prop (it is ignored); kept through an object spread.
        {...({ error: (errors || {}).birthday } as object)}
        label={t('BIRTHDAY_INPUT_LABEL')}
        onChange={onDateChange('birthday')}
        value={birthday || ''}
        maxDate={fourteenYearsAgo() as unknown as Dayjs}
        handleNextStep={() => setActiveStep(activeStep + 1)}
        // All of the form's own props are spread here, `setId` among them: it replaced the id builder that used
        // to be set above (`birthday-...`), which is why that one is gone. Kept as is (unreachable with the bpmn
        // theme, which does not set `useBirthday`).
        {...props}
      />
    );
  }, [birthday, errors, handleChange, setId, classes, setActiveStep, activeStep, t]);

  const renderCheckboxField = React.useCallback(
    (name: string) => {
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
    const steps: Step[] = [
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
            >
              {t('ACCEPT')}
            </Button>
          </>
        ),
      },
    ];

    if (optionalTheme.useBirthday) {
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
        description: () => <>{renderBirthdayField()}</>,
      });
    }

    if (!optionalTheme.hiddenEmail) {
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
    const steps: Step[] = [
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
            >
              {t('ACCEPT')}
            </Button>
          </>
        ),
      },
    ];

    if (optionalTheme.useDateRegistration) {
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
          connector={null}
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
            error={errors.agreement as boolean | undefined}
            component="fieldset"
            className={classNames(classes.formControl, classes.formControlAgreement)}
            id={setId('control-agreement')}
          >
            {optionalTheme.hideTermsLink ? null : (
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
          {optionalTheme.useIndividualEntrepreneur && renderCheckboxField('isIndividualEntrepreneur')}
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
            aria-label={t('ACTIVATE')}
          >
            {t('ACTIVATE')}
          </Button>
        )}
        <Button
          onClick={handleDiscard}
          color="inherit"
          variant={optionalTheme.discardOutlined ? 'outlined' : 'text'}
          id={setId('discard-button')}
          aria-label={t('DISCARD')}
          sx={{ ml: 1, mb: 1 }}
        >
          {t('DISCARD')}
        </Button>
      </Toolbar>
    </>
  );
};

const styled = withStyles(style as Styles<Theme, {}, string>)(RegisterForm);

const translated = translate('RegisterForm')(styled);

export default translated;
