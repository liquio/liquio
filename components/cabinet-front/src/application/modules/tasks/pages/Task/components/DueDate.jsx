import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import moment from 'moment';
import { Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';

import { setTaskDueDate } from 'application/actions/task';
import { Content } from 'layouts/LeftSidebar';
import checkAccess from 'helpers/checkAccess';

const useStyles = makeStyles(() => ({
  dataPicker: {
    marginTop: 20
  }
}));

const KeyboardDatePicker = React.lazy(() => import('components/KeyboardDatePicker/index.jsx'));

const dateFormat = 'DD.MM.YYYY HH:mm';

const DueDate = ({
  t,
  task,
  actions,
  userInfo,
  userUnits,
  task: { dueDate, performerUnits, finished },
  isInline,
  template: {
    jsonSchema: { hideDatePicker }
  }
}) => {
  const classes = useStyles();

  const isUserUnitHead = React.useMemo(
    () => checkAccess({ isUserUnitHead: performerUnits }, userInfo, userUnits),
    [userInfo, userUnits, performerUnits]
  );

  const handleChange = React.useCallback(
    ({ value }) => {
      if (value === null) {
        actions.setTaskDueDate(task.id, value);
      }

      actions.setTaskDueDate(task.id, moment(value, dateFormat).toISOString());
    },
    [actions, task.id]
  );

  const body = !hideDatePicker ? (
    <div className={classes.dataPicker}>
      <KeyboardDatePicker
        label={'DueDate'}
        dateFormat={'DD.MM.YYYY HH:mm'}
        minDate={moment()}
        value={dueDate ? moment(dueDate) : null}
        onChange={handleChange}
      />
    </div>
  ) : null;

  if (!isUserUnitHead) return null;

  if (dueDate && finished) {
    return (
      <Typography>
        {t('DueDate')}: {moment(dueDate).format('DD.MM.YYYY HH:mm')}
      </Typography>
    );
  }

  return <>{isInline ? body : <Content small={true}>{body}</Content>}</>;
};

DueDate.propTypes = {
  task: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  classes: PropTypes.object.isRequired,
  isInline: PropTypes.bool,
  userInfo: PropTypes.object.isRequired,
  userUnits: PropTypes.array.isRequired
};

DueDate.defaultProps = {
  isInline: false
};

const mapState = ({ auth: { userUnits, info } }) => ({
  userUnits,
  userInfo: info
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    setTaskDueDate: bindActionCreators(setTaskDueDate, dispatch)
  }
});

const translated = translate('TaskPage')(DueDate);

export default connect(mapState, mapDispatchToProps)(translated);
