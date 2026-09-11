import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslate } from 'react-translate';
import {
  StepButton,
  Stepper,
  Step,
  StepLabel,
  Hidden,
  Tooltip,
  Typography,
  IconButton,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import evaluate from 'helpers/evaluate';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIosNew';
import { ReactComponent as ErrorIcon } from 'assets/img/steps_warning.svg';
import { ReactComponent as CompletedIcon } from 'assets/img/complete_step.svg';

const styles = (theme) => ({
  relative: {
    position: 'relative',
  },
  stepper: {
    overflow: 'hidden',
    marginBottom: 32,
    paddingTop: 5,
    paddingBottom: 3,
  },
  marginScrollable: {
    marginBottom: 24,
  },
  stepperScroll: {
    overflowX: 'auto',
    paddingBottom: 5,
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },
  step: {
    wordWrap: 'break-word',
    boxSizing: 'border-box',
    flex: '1 0 20%',
  },
  mobileStepper: {
    backgroundColor: theme.leftSidebarBg,
    marginTop: 16,
    marginBottom: 24,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.down('sm')]: {
      marginLeft: -16,
      marginRight: -16,
    },
  },
  stepIconActiveNumber: {
    color: '#767676',
    ...(theme?.stepIconActiveNumber || {}),
  },
  stepIconActiveNumberActive: {
    color: theme.palette.primary.main,
    fontSize: 16,
    fontWeight: theme?.stepIconActive?.fontWeight || 500,
  },
  stepIcon: {
    width: '100%',
    borderRadius: '50%',
    border: '1px solid #767676',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconActive: {
    color: theme.palette.primary.main,
    border: `2px solid ${theme.palette.primary.main}`,
    backgroundColor: theme?.stepIconActive?.backgroundColor || '#E5F0FF',
  },
  stepIconError: {
    color: theme.palette.error.main,
    border: 'none',
  },
  stepIconCompleted: {
    border: 'none',
  },
  alternativeLabel: {
    color: theme.palette.error.main,
  },
  scrollButton: {
    position: 'absolute',
    left: 0,
    top: 3,
    margin: 'auto',
    zIndex: 10,
    '& svg': {
      color: theme.palette.primary.main,
    },
  },
  scrollNextButton: {
    right: 0,
    left: 'unset',
  },
  stepsState: {
    width: '100%',
    display: 'block',
    textAlign: 'center',
    marginBottom: 24,
  },
  hidden: {
    display: 'none',
  },
  hideStepper: {
    ...(theme?.hideStepper || {}),
  },
});

const getTitle = (string, data) => {
  const evaluatedTitle = evaluate(string, data);

  if (!(evaluatedTitle instanceof Error)) return evaluatedTitle;

  return string;
};

const STEPPER_LIMIT = 5;

const SchemaStepper = ({
  task,
  steps,
  classes,
  activeStep,
  errors,
  handleStep,
  jsonSchema: { properties, hideStepperTitles = false },
  isOnboarding,
}) => {
  const t = useTranslate('SchemaStepper');
  const stepperRef = React.useRef(null);
  const [scrollPosition, setScrollPosition] = React.useState(0);
  const [stepOnScroll, setStepOnScroll] = React.useState(activeStep);

  const stepRefs = React.useRef([]);

  React.useEffect(() => {
    setTimeout(() => {
      if (stepRefs.current[activeStep]) {
        const stepElement = stepRefs.current[activeStep];
        if (activeStep <= 4) {
          stepperRef.current.scrollTo({
            left: 0,
            behavior: 'smooth',
          });
        } else if (stepElement.offsetLeft >= stepperRef.current.offsetWidth) {
          stepperRef.current.scrollTo({
            left:
              stepElement.offsetLeft -
              stepperRef.current.offsetWidth +
              stepElement.offsetWidth,
            behavior: 'smooth',
          });
        }
      }
    }, 0);
  }, [activeStep]);

  const handleScroll = React.useCallback(() => {
    setScrollPosition(stepperRef.current.scrollLeft);
  }, [stepperRef]);

  React.useEffect(() => {
    const ref = stepperRef?.current;

    if (!ref) return;

    ref.addEventListener('scroll', handleScroll);
    return () => {
      ref.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  const stepElements = stepperRef?.current?.querySelectorAll('.MuiStep-root');
  const disablePrev = React.useMemo(
    () => scrollPosition === 0,
    [scrollPosition],
  );
  const disableNext = React.useMemo(
    () => stepOnScroll === stepElements?.length - STEPPER_LIMIT,
    [stepOnScroll, stepElements],
  );
  const scrollable = React.useMemo(() => steps.length > STEPPER_LIMIT, [steps]);

  const Icon = React.useCallback(({ completed, error }) => {
    if (completed) {
      return <CompletedIcon />;
    }

    if (error) {
      return <ErrorIcon />;
    }

    return null;
  }, []);

  const StepIconComponent = React.useCallback(
    ({ active, completed, error, index }) => {
      return (
        <div
          className={classNames({
            [classes.stepIcon]: true,
            [classes.stepIconActive]: active,
            [classes.stepIconCompleted]: completed,
            [classes.stepIconError]: error,
          })}
        >
          <Icon completed={completed} error={error} />
          <Typography
            variant="label"
            className={classNames({
              [classes.stepIconActiveNumber]: true,
              [classes.stepIconActiveNumberActive]: active,
              [classes.hidden]: completed || error,
            })}
          >
            {index + 1}
          </Typography>
        </div>
      );
    },
    [classes],
  );

  const scrollNext = React.useCallback(() => {
    const stepElements = stepperRef.current.querySelectorAll('.MuiStep-root');
    const stepElement = stepElements[activeStep];
    stepperRef.current.scrollLeft =
      stepperRef.current.scrollLeft + stepElement.offsetWidth;
    setScrollPosition(stepperRef.current.scrollLeft);
    setStepOnScroll(stepOnScroll + 1);
  }, [activeStep, stepOnScroll]);

  const scrollPrev = React.useCallback(() => {
    const stepElements = stepperRef.current.querySelectorAll('.MuiStep-root');
    const stepElement = stepElements[activeStep];
    stepperRef.current.scrollLeft =
      stepperRef.current.scrollLeft - stepElement.offsetWidth;
    setScrollPosition(stepperRef.current.scrollLeft);
    setStepOnScroll(stepOnScroll - 1);
  }, [activeStep, stepOnScroll]);

  if (steps.length <= 1) {
    return null;
  }

  return (
    <>
      <div className={isOnboarding && classes.hideStepper}>
        <Hidden mdDown={true}>
          <div className={classes.relative}>
            {scrollable ? (
              <IconButton
                onClick={scrollPrev}
                className={classNames({
                  [classes.scrollButton]: true,
                  [classes.hidden]: disablePrev,
                })}
                aria-label={t('PrevStep')}
                size="small"
              >
                <ArrowBackIosIcon />
              </IconButton>
            ) : null}

            <Stepper
              alternativeLabel={true}
              activeStep={activeStep}
              className={classNames({
                [classes.stepper]: true,
                [classes.stepperScroll]: scrollable,
                [classes.marginScrollable]: scrollable,
              })}
              ref={stepperRef}
            >
              {steps.map((stepId, index) => {
                const title = getTitle(
                  properties[stepId]?.description || '',
                  task?.document?.data,
                );

                const disabled = index >= activeStep;

                const button = (
                  <StepButton
                    completed={false}
                    onClick={
                      disabled
                        ? null
                        : () => {
                            handleStep(index);
                          }
                    }
                    aria-label={`${t('Step', {
                      index: index + 1,
                      step: title,
                    })}`}
                  >
                    {hideStepperTitles ? null : (
                      <StepLabel
                        error={errors[stepId]}
                        classes={{
                          alternativeLabel: classNames({
                            [classes.alternativeLabel]: errors[stepId],
                          }),
                        }}
                        StepIconComponent={(props) => (
                          <StepIconComponent {...props} index={index} />
                        )}
                      >
                        {title}
                      </StepLabel>
                    )}
                  </StepButton>
                );

                return (
                  <Step
                    ref={(el) => (stepRefs.current[index] = el)}
                    key={stepId}
                    className={classes.step}
                    completed={activeStep > index}
                  >
                    {hideStepperTitles ? (
                      <Tooltip arrow={true} title={title}>
                        {button}
                      </Tooltip>
                    ) : (
                      button
                    )}
                  </Step>
                );
              })}
            </Stepper>

            <Typography
              variant="breadcrumbs"
              className={classNames({
                [classes.stepsState]: true,
                [classes.hidden]: !scrollable,
              })}
            >
              {t('StepsState', {
                activeStep: activeStep + 1,
                steps: steps.length,
              })}
            </Typography>

            {scrollable ? (
              <IconButton
                onClick={scrollNext}
                className={classNames({
                  [classes.scrollButton]: true,
                  [classes.scrollNextButton]: true,
                  [classes.hidden]: disableNext,
                })}
                aria-label={t('NextStep')}
                size="small"
              >
                <ArrowForwardIosIcon />
              </IconButton>
            ) : null}
          </div>
        </Hidden>
        <Hidden mdUp={true}>
          <div className={classes.mobileStepper}>
            <Typography variant="breadcrumbs">
              {t('MobileStepsState', {
                activeStep: activeStep + 1,
                steps: steps.length,
              })}
            </Typography>
            {activeStep + 1 !== steps?.length ? (
              <span>
                <Typography variant="caption">{t('NextStepTitle')}</Typography>
                <Typography variant="label1">
                  {getTitle(
                    properties[steps[activeStep + 1]]?.description || '',
                    task?.document?.data,
                  )}
                </Typography>
              </span>
            ) : null}
          </div>
        </Hidden>
      </div>
    </>
  );
};

SchemaStepper.propTypes = {
  steps: PropTypes.array.isRequired,
  errors: PropTypes.array.isRequired,
  classes: PropTypes.object.isRequired,
  activeStep: PropTypes.number.isRequired,
  handleStep: PropTypes.func.isRequired,
  jsonSchema: PropTypes.object.isRequired,
  task: PropTypes.object.isRequired,
};

export default withStyles(styles)(SchemaStepper);
