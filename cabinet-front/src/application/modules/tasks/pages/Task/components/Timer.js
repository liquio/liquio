import React from 'react';
import PropTypes from 'prop-types';
import useCountDown from 'react-countdown-hook';
import classNames from 'classnames';
import moment from 'moment';
import { Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';

import evaluate from 'helpers/evaluate';
import waiter from 'helpers/waitForAction';

const styles = () => ({
  finished: {
    '& .pendingText': {
      color: '#B01038'
    },
    '& .timeValue': {
      backgroundColor: '#FED3D1'
    }
  },
  pendingText: {
    color: '#000',
    fontSize: '14px',
    lineHeight: '21px',
    display: 'inline-block',
    marginBottom: '8px'
  },
  timeWrapper: {
    display: 'flex',
    gap: '10px'
  },
  timeValue: {
    fontSize: '24px',
    lineHeight: '48px',
    padding: '0 22px',
    backgroundColor: '#FFD79D',
    borderRadius: '8px',
    marginBottom: '4px'
  },
  timeSeparator: {
    fontSize: '24px',
    lineHeight: '48px'
  },
  timeLabel: {
    fontSize: '12px',
    lineHeight: '16px'
  }
});

const useStyles = makeStyles(styles);

const TimerComponent = ({
  pendingText,
  finishedText,
  timerValueDate,
  rootDocument,
  handleSave
}) => {
  const classes = useStyles();

  const parsedTime = React.useMemo(() => {
    return moment(timerValueDate).diff(moment(), 'seconds');
  }, [timerValueDate]);

  const [timeLeft, { start }] = useCountDown(parsedTime * 1000, 1000);

  React.useEffect(() => {
    if (parsedTime) {
      start(parsedTime * 1000);
    }
  }, [start, parsedTime]);

  React.useEffect(() => {
    waiter.removeAction('handle_finish_timer');
    if (timeLeft === 0 && rootDocument?.data?.taskTimer !== 'finished') {
      waiter.addAction(
        'handle_finish_timer',
        () => {
          handleSave('finished');
        },
        2000
      );
    }
  }, [timeLeft, handleSave, rootDocument]);

  const addZero = (value) => (value < 10 ? `0${value}` : value);

  const hours = addZero(Math.floor(timeLeft / 1000 / 60 / 60));
  const minutes = addZero(Math.floor(timeLeft / 1000 / 60));
  const minutesLeft = addZero(Math.floor(timeLeft / 1000 / 60) - Number(hours) * 60);
  const seconds = addZero(Math.floor(timeLeft / 1000) - Number(minutes) * 60);

  return (
    <div
      className={classNames({
        [classes.pendingText]: true,
        [classes.finished]: timeLeft === 0
      })}
    >
      <span className={'pendingText'}>{timeLeft === 0 ? finishedText : pendingText}</span>
      <div className={classes.timeWrapper}>
        <div className={classes.timeBlock}>
          <Typography
            className={classNames({
              [classes.timeValue]: true,
              timeValue: true
            })}
          >
            {hours}
          </Typography>
          <Typography className={classes.timeLabel}>Години</Typography>
        </div>
        <Typography className={classes.timeSeparator}>:</Typography>
        <div className={classes.timeBlock}>
          <Typography
            className={classNames({
              [classes.timeValue]: true,
              timeValue: true
            })}
          >
            {minutesLeft}
          </Typography>
          <Typography className={classes.timeLabel}>Хвилини</Typography>
        </div>
        <Typography className={classes.timeSeparator}>:</Typography>
        <div className={classes.timeBlock}>
          <Typography
            className={classNames({
              [classes.timeValue]: true,
              timeValue: true
            })}
          >
            {seconds}
          </Typography>
          <Typography className={classes.timeLabel}>Секунди</Typography>
        </div>
      </div>
    </div>
  );
};

TimerComponent.propTypes = {
  timerValue: PropTypes.number,
  pendingText: PropTypes.string.isRequired,
  finishedText: PropTypes.string.isRequired,
  timerValueDate: PropTypes.string
};

TimerComponent.defaultProps = {
  timerValue: null,
  timerValueDate: null
};

const Timer = ({ task, jsonSchema, steps, activeStep, actions }) => {
  const { taskTimer } = jsonSchema;

  const timerData = React.useMemo(() => {
    return evaluate(taskTimer || '', task?.document?.data) || {};
  }, [taskTimer, task]);

  const { timer, steps: stepsProps } = React.useMemo(() => {
    return timerData;
  }, [timerData]);

  const handleSave = React.useCallback(
    (e) => actions.handleChange.bind(null, 'taskTimer')(e),
    [actions]
  );

  if (!taskTimer || !timer) return null;

  if (stepsProps) {
    const activeStepName = steps[activeStep];

    const isStepTimer = stepsProps.includes(activeStepName);

    if (!isStepTimer) return null;
  }

  return (
    <TimerComponent
      pendingText={timerData?.pendingText}
      finishedText={timerData?.finishedText}
      timerValueDate={timerData?.timerValueDate}
      handleSave={handleSave}
      rootDocument={task.document}
    />
  );
};

Timer.propTypes = {
  task: PropTypes.object,
  jsonSchema: PropTypes.object,
  steps: PropTypes.array,
  activeStep: PropTypes.number.isRequired
};

Timer.defaultProps = {
  task: {},
  steps: [],
  jsonSchema: {}
};

export default Timer;
