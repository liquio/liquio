import React from 'react';
import { translate } from 'react-translate';
import classNames from 'classnames';
import moment from 'moment';
import withStyles from '@mui/styles/withStyles';
import TimeLabel from './Time';

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  colorPrimary: {
    color: '#007A64',
  },
  colorFinished: {
    color: '#B01038',
  },
  colorDeading: {
    color: '#AD6000',
  },
  hidden: {
    display: 'none',
  },
};

interface DeadlineProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  classes: Record<string, string>;
  start: string;
  end?: string | null;
  finished?: boolean;
}

const Deadline = ({ t, classes, start, end = null, finished = false }: DeadlineProps) => {
  if (!end || !start) return null;

  const now = moment();

  const endDate = moment(end);

  const dateDiff = moment.duration(endDate.diff(now)).humanize();

  const dateDiffInDays = endDate.diff(now, 'days');

  const tooltip =
    now.diff(end) < 0
      ? t('DueDate', { date: dateDiff })
      : t('Expired', { date: dateDiff });

  return (
    <div className={classes.wrapper}>
      <TimeLabel date={end} />
      <span
        className={classNames({
          [classes.colorPrimary]: true,
          [classes.colorDeading]: dateDiffInDays <= 5 && dateDiffInDays >= 0,
          [classes.colorFinished]: dateDiffInDays < 0,
          [classes.hidden]: dateDiffInDays > 6 || finished,
        })}
      >
        {tooltip}
      </span>
    </div>
  );
};

const translated = translate('Labels')(Deadline as never);
export default withStyles(styles)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
