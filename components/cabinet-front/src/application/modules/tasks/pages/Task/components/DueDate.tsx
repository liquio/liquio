import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';
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

const KeyboardDatePicker = React.lazy(() => import('components/KeyboardDatePicker')) as unknown as React.ComponentType<
  Record<string, unknown>
>;

const dateFormat = 'DD.MM.YYYY HH:mm';

interface Unit {
  id: string | number;
}

interface TaskLike {
  id: string | number;
  dueDate?: string;
  performerUnits?: Array<string | number>;
  finished?: boolean;
}

interface DueDateProps {
  t: (key: string) => string;
  task: TaskLike;
  actions: { setTaskDueDate: (taskId: string | number, dueDate: unknown) => void };
  userInfo: Record<string, unknown>;
  userUnits: Unit[];
  isInline?: boolean;
  template: { jsonSchema: { hideDatePicker?: boolean } };
}

const DueDate = ({
  t,
  task,
  actions,
  userInfo,
  userUnits,
  task: { dueDate, performerUnits, finished },
  isInline = false,
  template: {
    jsonSchema: { hideDatePicker }
  }
}: DueDateProps) => {
  const classes = useStyles();

  const isUserUnitHead = React.useMemo(
    () => checkAccess({ isUserUnitHead: performerUnits }, userInfo, userUnits as never),
    [userInfo, userUnits, performerUnits]
  );

  const handleChange = React.useCallback(
    ({ value }: { value: unknown }) => {
      // No `return` after the null branch in the original — when `value` is
      // null, this dispatches `setTaskDueDate` with `null` and then
      // immediately again with `moment(null, dateFormat).toISOString()`
      // (moment's "invalid date" ISO string). Preserved exactly.
      if (value === null) {
        actions.setTaskDueDate(task.id, value);
      }

      actions.setTaskDueDate(task.id, moment(value as string, dateFormat).toISOString());
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

interface ConnectedState {
  auth: { userUnits: Unit[]; info: Record<string, unknown> };
}

const mapState = ({ auth: { userUnits, info } }: ConnectedState) => ({
  userUnits,
  userInfo: info
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    setTaskDueDate: bindActionCreators(setTaskDueDate, dispatch)
  }
});

const translated = translate('TaskPage')(DueDate as never);

export default connect(mapState, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
