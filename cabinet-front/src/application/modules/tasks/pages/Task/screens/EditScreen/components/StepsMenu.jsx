import React from 'react';
import PropTypes from 'prop-types';
import evaluate from 'helpers/evaluate';
import classNames from 'classnames';
import MobileDetect from 'mobile-detect';
import { useTranslate } from 'react-translate';
import { Drawer, Stepper, Step, StepLabel, Divider, IconButton, Hidden } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import MenuIcon from '@mui/icons-material/Menu';

import Scrollbar from 'components/Scrollbar';

const styles = (theme) => ({
  drawerPaper: {
    backgroundColor: '#E7EEF3',
    position: 'inherit',
    padding: '168px 10px 0',
    [theme.breakpoints.down('lg')]: {
      padding: '0px 10px'
    },
    [theme.breakpoints.down('md')]: {
      padding: 0
    }
  },
  stepper: {
    backgroundColor: '#E7EEF3',
    padding: 10,
    height: '100%'
  },
  divider: {
    margin: '20px 0',
    paddingLeft: 20,
    paddingRight: 10
  },
  stepBtn: {
    '&:hover': {
      cursor: 'pointer'
    },
    '& > span > span': {
      color: '#000'
    }
  },
  disabled: {
    '& > span > span': {
      color: '#00000080'
    },
    '&:hover': {
      backgroundColor: '#000',
      '& > span > span': {
        color: '#fff',
        opacity: 1
      }
    }
  },
  active: {
    backgroundColor: '#000',
    color: '#000'
  },
  activeColor: {
    color: '#fff'
  },
  defaultCursor: {
    pointerEvents: 'none'
  },
  contentWrapper: {
    position: 'absolute',
    left: 20,
    top: 0,
    height: '100%'
  }
});

const useStyles = makeStyles(styles);

const StepsMenu = ({
  steps,
  jsonSchema,
  activeStep,
  handleSetStep,
  validationPageErrors,
  task,
  showStepsMenu,
  width
}) => {
  const t = useTranslate('TaskPage');
  const classes = useStyles();

  const [open, setOpen] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();
    return !isMobile;
  });

  const getTitle = (string, data) => {
    const evaluatedTitle = evaluate(string, data);

    if (!(evaluatedTitle instanceof Error)) return evaluatedTitle;

    return string;
  };

  const checkStepOnNavigating = (stepsArray) => {
    const filtered = stepsArray.filter((stepId) => {
      const param = jsonSchema?.properties[stepId]?.allowNavigationWithoutCheck;

      if (!param) return false;

      const evaluatedHidden = evaluate(param, task?.document?.data);

      if (param instanceof Error) {
        return param;
      }

      return evaluatedHidden;
    });

    return filtered;
  };

  const stepInMenu = checkStepOnNavigating(steps);

  if (!showStepsMenu) return null;

  const renderList = (
    <Stepper
      activeStep={activeStep}
      orientation="vertical"
      className={classes.stepper}
      connector=""
    >
      <Scrollbar options={{ suppressScrollX: true }}>
        {steps.map((stepId, index) => {
          const titleToEval = jsonSchema?.properties[stepId]?.description || '';
          const title = getTitle(titleToEval, task?.document?.data) || t('Check');

          const stepAllowed = stepInMenu.includes(stepId) || index < activeStep;

          return (
            <Step
              key={stepId}
              className={classes.step}
              onClick={() => {
                if (!stepAllowed) return;
                handleSetStep(index);
              }}
            >
              <StepLabel
                icon={null}
                error={validationPageErrors[stepId]}
                className={classNames(classes.stepBtn, {
                  [classes.disabled]: !stepAllowed,
                  [classes.active]: index === activeStep,
                  [classes.defaultCursor]: !stepAllowed
                })}
              >
                <div
                  className={classNames(classes.divider, {
                    [classes.activeColor]: index === activeStep
                  })}
                >
                  {t('StepIndex', {
                    index: index + 1,
                    title
                  })}
                </div>
              </StepLabel>
              <Divider />
            </Step>
          );
        })}
      </Scrollbar>
    </Stepper>
  );

  return (
    <>
      <Hidden only={['xl', 'lg', 'md']}>
        <IconButton onClick={() => setOpen(!open)} size="large">
          <MenuIcon />
        </IconButton>

        <Drawer
          anchor="left"
          open={open}
          className={classes.drawer}
          onClose={() => setOpen(false)}
          classes={{
            paper: classes.drawerPaper
          }}
        >
          {renderList}
        </Drawer>
      </Hidden>

      <Hidden only={['sm', 'xs']}>
        <div className={classes.contentWrapper} style={{ width }}>
          {renderList}
        </div>
      </Hidden>
    </>
  );
};

StepsMenu.propTypes = {
  steps: PropTypes.array.isRequired,
  activeStep: PropTypes.number.isRequired,
  handleSetStep: PropTypes.func.isRequired,
  jsonSchema: PropTypes.object.isRequired,
  validationPageErrors: PropTypes.array,
  task: PropTypes.object.isRequired,
  showStepsMenu: PropTypes.bool,
  width: PropTypes.number.isRequired
};

StepsMenu.defaultProps = {
  validationPageErrors: [],
  showStepsMenu: false
};

export default StepsMenu;
