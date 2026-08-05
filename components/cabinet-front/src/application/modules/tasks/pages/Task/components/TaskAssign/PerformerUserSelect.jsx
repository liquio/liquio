import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { Checkbox, InputAdornment, ListItemText, MenuItem, TextField } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import Fuse from 'fuse.js';
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';

import { updateTaskAssign } from 'application/actions/task';
import { requestUnitInfo } from 'application/actions/users';
import UserName from 'components/Auth/UserName';
import Preloader from 'components/Preloader';
import arrayUnique from 'helpers/arrayUnique';

const styles = {
  icon: {
    marginRight: 10
  }
};

const useStyles = makeStyles(styles);

const PerformerUserSelect = ({
  t,
  actions,
  task: { id: taskId, performerUsers, performerUnits = [] },
  userUnits
}) => {
  const [value, setValue] = React.useState(performerUsers);
  const [users, setUsers] = React.useState(null);
  const [search, setSearch] = React.useState('');

  const classes = useStyles();

  React.useEffect(() => {
    if (users) {
      return;
    }

    const updateUsers = async () => {
      const userHeadUnitIds = userUnits.filter(({ head }) => head).map(({ id }) => id);
      const units = performerUnits.filter((unitId) => userHeadUnitIds.includes(unitId));

      const unitInfos = await Promise.all(units.map(actions.requestUnitInfo));

      const allUsers = [].concat(...(unitInfos || []).map(({ membersUsers }) => membersUsers));
      const userIds = arrayUnique(allUsers.map(({ userId }) => userId));
      setUsers(userIds.map((id) => allUsers.find(({ userId }) => id === userId)));
    };

    updateUsers();
  });

  const fuse = new Fuse(users || [], {
    includeScore: true,
    minMatchCharLength: 2,
    keys: ['email', 'firstName', 'lastName', 'middleName', 'phone']
  });
  const result = search
    ? fuse
        .search(search)
        .filter(({ score }) => score < 0.1)
        .map(({ item }) => item)
    : users;

  return users === null ? (
    <Preloader />
  ) : (
    <>
      <TextField
        label={t('Search')}
        variant="outlined"
        size="small"
        value={search}
        onChange={({ target: { value: searchValue } }) => setSearch(searchValue)}
        endAdornment={
          <InputAdornment position="end">
            <SearchOutlinedIcon />
          </InputAdornment>
        }
      />
      {result.map((user) => (
        <MenuItem
          key={user.userId}
          onClick={() => {
            let newValue;
            if (value.includes(user.userId)) {
              newValue = value.filter((userId) => userId !== user.userId);
            } else {
              newValue = value.concat(user.userId);
            }
            setValue(newValue);
            actions.updateTaskAssign(taskId, newValue);
          }}
        >
          <Checkbox className={classes.icon} checked={value.includes(user.userId)} />
          <ListItemText primary={<UserName {...user} />} />
        </MenuItem>
      ))}
    </>
  );
};

const mapState = ({ auth: { userUnits } }) => ({ userUnits });

const mapDispatch = (dispatch) => ({
  actions: {
    requestUnitInfo: bindActionCreators(requestUnitInfo, dispatch),
    updateTaskAssign: bindActionCreators(updateTaskAssign, dispatch)
  }
});

const translated = translate('TaskPage')(PerformerUserSelect);
export default connect(mapState, mapDispatch)(translated);
