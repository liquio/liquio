import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { Typography, IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ListIcon from '@mui/icons-material/List';

import { Content } from 'layouts/LeftSidebar';
import PerformerUserSelect from './PerformerUserSelect';
import PerformerUserList from './PerformerUserList';

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
}) => {
  const [edit, setEdit] = React.useState(false);

  const userHeadUnitIds = userUnits.filter(({ head }) => head).map(({ id }) => id);

  const units = performerUnits.filter((unitId) => userHeadUnitIds.includes(unitId));

  const canEdit = !!units.length && !finished;

  const body = (
    <>
      <div className={classes.labelWrapper}>
        <Typography variant="label" className={classes.listHeadline}>
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

const mapState = ({ auth: { userUnits } }) => ({ userUnits });

const styled = withStyles(styles)(TaskAssign);
const translated = translate('TaskPage')(styled);
export default connect(mapState)(translated);
