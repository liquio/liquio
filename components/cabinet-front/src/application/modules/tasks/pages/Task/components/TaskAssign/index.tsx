import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { Typography, IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ListIcon from '@mui/icons-material/List';

import { Content } from 'layouts/LeftSidebar';
import PerformerUserSelectRaw from './PerformerUserSelect';
import PerformerUserListRaw from './PerformerUserList';

const PerformerUserSelect = PerformerUserSelectRaw as unknown as React.ComponentType<Record<string, unknown>>;
const PerformerUserList = PerformerUserListRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  flexGrow: {
    flexGrow: 1
  },
  inlineWrapper: {
    marginTop: 5
  },
  labelWrapper: {
    padding: '16px 0'
  },
  listHeadline: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 10
  },
  editButton: {
    marginLeft: 10
  }
};

interface Unit {
  id: string | number;
  head?: boolean;
}

interface TaskLike {
  performerUnits: Array<string | number>;
  finished?: boolean;
  [key: string]: unknown;
}

interface TaskAssignProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  task: TaskLike;
  userUnits: Unit[];
  isInline?: boolean;
  template: { jsonSchema: { hideEditAssign?: boolean } };
}

const TaskAssign = ({
  t,
  classes,
  task,
  task: { performerUnits, finished },
  userUnits,
  isInline,
  template: {
    jsonSchema: { hideEditAssign }
  }
}: TaskAssignProps) => {
  const [edit, setEdit] = React.useState(false);

  const userHeadUnitIds = userUnits.filter(({ head }) => head).map(({ id }) => id);

  const units = performerUnits.filter((unitId) => userHeadUnitIds.includes(unitId));

  const canEdit = !!units.length && !finished;

  const body = (
    <>
      <div className={classes.labelWrapper}>
        <Typography {...({ variant: 'label' } as unknown as Record<string, unknown>)} className={classes.listHeadline}>
          {t('TaskAssign')}
          {canEdit && !hideEditAssign ? (
            <IconButton
              onClick={() => setEdit(!edit)}
              size="small"
              className={classes.editButton}
              aria-label={t('ChangeAssign')}
            >
              {edit ? <ListIcon /> : <EditOutlinedIcon />}
            </IconButton>
          ) : null}
        </Typography>
        <div className={classes.flexGrow} />
      </div>
      {edit ? (
        <PerformerUserSelect task={task} setEdit={setEdit} />
      ) : (
        <PerformerUserList task={task} setEdit={setEdit} />
      )}
    </>
  );

  return (
    <>
      {isInline ? (
        <div className={classes.inlineWrapper}>{body}</div>
      ) : (
        <Content small={true}>{body}</Content>
      )}
    </>
  );
};

interface ConnectedState {
  auth: { userUnits: Unit[] };
}

const mapState = ({ auth: { userUnits } }: ConnectedState) => ({ userUnits });

const styled = withStyles(styles)(TaskAssign as never);
const translated = translate('TaskPage')(styled as never);
export default connect(mapState)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
