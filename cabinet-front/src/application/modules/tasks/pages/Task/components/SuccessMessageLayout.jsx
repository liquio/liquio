import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { Button, Typography, Dialog, DialogContent } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import NavigateNextIcon from '@mui/icons-material/NavigateNextRounded';
import { Link } from 'react-router-dom';

import evaluate from 'helpers/evaluate';
import renderHTML from 'helpers/renderHTML';
import { ReactComponent as SuccessIcon } from 'assets/img/success.svg';
import { history } from 'store';

const styles = (theme) => ({
  wrapper: {
    flexGrow: 1,
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column'
  },
  root: {
    padding: '110px 181px',
    [theme.breakpoints.down('md')]: {
      padding: '70px 40px'
    },
    [theme.breakpoints.down('sm')]: {
      padding: '50px 20px'
    }
  },
  icon: {
    fontSize: 82,
    color: 'green'
  },
  title: {
    textAlign: 'center'
  },
  description: {
    textAlign: 'center'
  },
  button: {
    textDecoration: 'none'
  },
  action: {
    marginTop: 40
  },
  actionButton: {
    marginRight: 10
  },
  workflowsButton: {
    whiteSpace: 'nowrap'
  }
});

const SuccessMessageLayout = ({
  t,
  classes,
  finalScreen,
  nextTasks,
  rootPath,
  task,
  showNextTaskButton
}) => {
  const nextTask = (nextTasks || []).shift();
  const { callBack } = finalScreen;

  React.useEffect(() => {
    if (callBack) {
      evaluate(callBack);
    }
  }, [callBack]);

  const getTitle = () => {
    const evaluatedTitle = evaluate(
      (finalScreen || {}).title,
      task && task.document && task.document.data
    );

    if (!(evaluatedTitle instanceof Error)) {
      return renderHTML(evaluatedTitle);
    }

    return false;
  };

  const getSubtitle = () => {
    const evaluatedTitle = evaluate(
      (finalScreen || {}).subtitle,
      task && task.document && task.document.data
    );

    if (!(evaluatedTitle instanceof Error)) {
      return renderHTML(evaluatedTitle);
    }

    return false;
  };

  const getNextButtonTitle = () => {
    const { nextTaskButtonName } = finalScreen || {};

    if (!nextTaskButtonName) {
      return t('GoToNextTask');
    }

    const evaluatedTitle = evaluate((finalScreen || {}).nextTaskButtonName, task?.document?.data);

    if (evaluatedTitle instanceof Error) {
      return nextTaskButtonName;
    }

    return evaluatedTitle;
  };

  const redirectToWorkflows = () => {
    history.push('/workflow');
  };

  const showDefaultButton = () => {
    const { hiddenDefaultButton } = finalScreen || {};

    if (typeof hiddenDefaultButton === 'string') {
      const evaluatedDefaultButton = evaluate(
        (finalScreen || {}).hiddenDefaultButton,
        task?.document?.data
      );

      if (evaluatedDefaultButton instanceof Error) {
        return !hiddenDefaultButton;
      }
    }

    return !hiddenDefaultButton;
  };

  const defaultButton = showDefaultButton();

  return (
    <Dialog open={true} maxWidth="md">
      <DialogContent
        classes={{
          root: classes.root
        }}
      >
        <div className={classes.wrapper}>
          <SuccessIcon className={classes.icon} />

          <Typography variant="h2" sx={{ mb: 1, mt: 3 }} className={classes.title}>
            {getTitle() || finalScreen.title || t('SuccessCommitMessageHeader')}
          </Typography>

          <Typography variant="body1" className={classes.description}>
            {getSubtitle() || finalScreen.subtitle || t('SuccessCommitMessageText')}
          </Typography>

          {defaultButton ? (
            <Button
              variant="contained"
              color="primary"
              onClick={redirectToWorkflows}
              sx={{ mt: 3 }}
              className={classes.workflowsButton}
            >
              {t('GoToWorkflows')}
            </Button>
          ) : null}

          {nextTask && showNextTaskButton ? (
            <div className={classes.action}>
              <Link to={`${rootPath}/${nextTask.id}`} className={classes.button}>
                <Button variant="contained" color="primary" size="large">
                  {getNextButtonTitle()}
                  <NavigateNextIcon />
                </Button>
              </Link>
            </div>
          ) : null}

          {Array.isArray(finalScreen.actions)
            ? finalScreen.actions.map(({ title, link, variant, color }, key) => (
                <div className={classes.action} key={key}>
                  <a href={link} className={classes.button}>
                    <Button
                      variant={variant}
                      color={color}
                      size="large"
                      className={classes.actionButton}
                    >
                      {title}
                    </Button>
                  </a>
                </div>
              ))
            : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

SuccessMessageLayout.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  finalScreen: PropTypes.object,
  nextTasks: PropTypes.array,
  showNextTaskButton: PropTypes.bool
};

SuccessMessageLayout.defaultProps = {
  finalScreen: {},
  nextTasks: null,
  showNextTaskButton: true
};

const translated = translate('TaskPage')(SuccessMessageLayout);
export default withStyles(styles)(translated);
