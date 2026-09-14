import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { Checkbox, InputAdornment, ListItemText, MenuItem, TextField } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import Fuse from 'fuse.js';
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';

import { updateTaskAssign } from 'application/actions/task';
import { requestUnitInfo } from 'application/actions/users';
import UserNameRaw from 'components/Auth/UserName';
import Preloader from 'components/Preloader';
import arrayUnique from 'helpers/arrayUnique';

const UserName = UserNameRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  icon: {
    marginRight: 10
  }
};

const useStyles = makeStyles(styles);

interface UnitMember {
  userId: string | number;
  email?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  phone?: string;
  [key: string]: unknown;
}

interface UnitInfo {
  membersUsers: UnitMember[];
}

interface Unit {
  id: string | number;
  head?: boolean;
}

interface PerformerUserSelectProps {
  t: (key: string) => string;
  actions: {
    requestUnitInfo: (unitId: string | number) => Promise<UnitInfo>;
    updateTaskAssign: (taskId: string | number, newPerformerUsers: unknown) => Promise<unknown>;
  };
  task: { id: string | number; performerUsers: Array<string | number>; performerUnits?: Array<string | number> };
  userUnits: Unit[];
}

const PerformerUserSelect = ({
  t,
  actions,
  task: { id: taskId, performerUsers, performerUnits = [] },
  userUnits
}: PerformerUserSelectProps) => {
  const [value, setValue] = React.useState(performerUsers);
  const [users, setUsers] = React.useState<UnitMember[] | null>(null);
  const [search, setSearch] = React.useState('');

  const classes = useStyles();

  // No dependency array here in the original — the effect re-runs every
  // render, guarded only by the `if (users) return;` early exit. Preserved
  // exactly rather than adding a deps array, which would change behavior.
  React.useEffect(() => {
    if (users) {
      return;
    }

    const updateUsers = async () => {
      const userHeadUnitIds = userUnits.filter(({ head }) => head).map(({ id }) => id);
      const units = performerUnits.filter((unitId) => userHeadUnitIds.includes(unitId));

      const unitInfos = await Promise.all(units.map(actions.requestUnitInfo));

      const allUsers = ([] as UnitMember[]).concat(...(unitInfos || []).map(({ membersUsers }) => membersUsers));
      const userIds = arrayUnique(allUsers.map(({ userId }) => userId)) as Array<string | number>;
      setUsers(userIds.map((id) => allUsers.find(({ userId }) => id === userId) as UnitMember));
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
        .filter(({ score }) => (score as number) < 0.1)
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
        {...({
          endAdornment: (
            <InputAdornment position="end">
              <SearchOutlinedIcon />
            </InputAdornment>
          )
        } as unknown as Record<string, unknown>)}
      />
      {(result || []).map((user) => (
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

interface ConnectedState {
  auth: { userUnits: Unit[] };
}

const mapState = ({ auth: { userUnits } }: ConnectedState) => ({ userUnits });

const mapDispatch = (dispatch: Dispatch) => ({
  actions: {
    requestUnitInfo: bindActionCreators(requestUnitInfo, dispatch),
    updateTaskAssign: bindActionCreators(updateTaskAssign, dispatch)
  }
});

const translated = translate('TaskPage')(PerformerUserSelect as never);
export default connect(mapState, mapDispatch)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
