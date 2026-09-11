import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import classNames from 'classnames';
import moment from 'moment';
import withStyles from '@mui/styles/withStyles';
import TimeLabel from 'components/Label/Time';

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
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

const Deadline = ({ t, classes, start, end, finished }) => {
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

Deadline.propTypes = {
  start: PropTypes.string.isRequired,
  classes: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
  finished: PropTypes.bool,
  end: PropTypes.string,
};

Deadline.defaultProps = {
  end: null,
  finished: false,
};

const translated = translate('Labels')(Deadline);
export default withStyles(styles)(translated);
