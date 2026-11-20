import React from 'react';
import { bindActionCreators, Dispatch } from 'redux';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { Button, Paper, TextField, Toolbar, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import GroupIcon from '@mui/icons-material/Group';

import { DataTableStated as DataTableStatedRaw } from 'components/DataTable';
import FilterHandler, { type FilterHandlerProps } from 'components/DataTable/components/FilterHandler';
import waiter from 'helpers/waitForAction';
import { getShortNameFromString } from 'helpers/getUserShortName';
import { searchUsers } from 'actions/users';

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    padding: 8
  },
  toolbar: {
    alignItems: 'flex-end'
  }
};

interface UserRecord {
  userId?: string;
  name?: string;
  ipn?: string;
  [key: string]: unknown;
}

interface UserIdsFilterHandlerState {
  search: string;
  searchResults: UserRecord[] | null;
  selected: string[];
}

class UserIdsFilterHandler extends FilterHandler {
  constructor(props: FilterHandlerProps) {
    super(props);

    this.state = {
      search: '',
      searchResults: null,
      selected: (props.value as string[]) || []
    };
  }

  renderIcon = () => <GroupIcon />;

  renderChip = () => {
    const { t, name, value = [], users } = this.props as FilterHandlerProps & { users: Record<string, UserRecord> };
    const userList = (value as string[]).map((userId) => users[userId] || userId);
    const userListStringified = userList
      .slice(0, 3)
      .map((user) => {
        if ((user as UserRecord).userId) {
          return getShortNameFromString((user as UserRecord).name as string);
        }
        return user;
      })
      .concat((userList.length > 3 && t?.('Others', { length: userList.length - 3 })) as never)
      .filter(Boolean)
      .join(', ');

    return [name, userListStringified].join(': ');
  };

  componentDidMount() {
    this.checkUserNames();
  }

  componentDidUpdate() {
    this.checkUserNames();
  }

  checkUserNames = async () => {
    const { users, actions, onChange } = this.props as FilterHandlerProps & { users: Record<string, UserRecord> };
    const { selected } = this.state as unknown as UserIdsFilterHandlerState;

    const notListedUsers = selected.filter((userId) => !users[userId]);

    if (!notListedUsers.length) {
      return;
    }

    let results = (await actions?.searchUsers?.({ ids: notListedUsers })) as UserRecord[] | Error;
    if (results instanceof Error) results = [];
    const notStoredUsers = notListedUsers.filter(
      (id) => !(results as UserRecord[]).find(({ userId }) => userId === id)
    );
    if (notStoredUsers.length) {
      onChange?.(selected.filter((userId) => !notStoredUsers.includes(userId)));
    }
  };

  handleSearch = () => {
    const { actions } = this.props;
    const { search } = this.state as unknown as UserIdsFilterHandlerState;

    if (search.length < 2) {
      return;
    }

    this.setState({ searchResults: null });
    waiter.addAction(
      'UserIdsFilterHandler',
      async () => {
        this.setState({ searchResults: null });
        const searchResults = await actions?.searchUsers?.({ search });
        this.setState({ searchResults });
      },
      1000
    );
  };

  renderHandler() {
    const { t, classes, users, onChange, type } = this.props as FilterHandlerProps & {
      classes: Record<string, string>;
      users: Record<string, UserRecord>;
    };
    const { search, selected, searchResults } = this.state as unknown as UserIdsFilterHandlerState;

    // Read at call time rather than module scope: `components/DataTable`'s
    // index.tsx re-exports `DataTableStated` from a file that imports back
    // from the same barrel, so it's circularly self-referencing (see
    // TYPESCRIPT.md's DataTable batch notes) — a module-top-level read can
    // run while that module is still mid-evaluation.
    const DataTableStated = DataTableStatedRaw as unknown as React.ComponentType<Record<string, unknown>>;

    return (
      <Paper elevation={0} className={classes.root}>
        <TextField
          variant="standard"
          autoFocus={true}
          value={search}
          placeholder={t?.('Search')}
          onChange={({ target: { value: newValue } }) =>
            this.setState({ search: newValue }, this.handleSearch)
          }
          type={type as string}
        />
        <DataTableStated
          controls={{ toolbar: false }}
          columns={[
            {
              id: 'userId',
              render: (value: unknown, user: UserRecord) => {
                if (value) {
                  const { name, userId, ipn } = user;
                  return `${name} (${userId}, ${ipn})`;
                }
                return user;
              }
            }
          ]}
          data={selected.map((userId) => users[userId] || userId)}
          emptyDataText={t?.('EmptySelection')}
          onRowClick={(user: UserRecord | string) =>
            this.setState({
              selected: selected.filter((id) => id !== ((user as UserRecord).userId || user))
            })
          }
        />
        {search ? (
          <>
            <DataTableStated
              controls={{ toolbar: true }}
              CustomToolbar={() => <Typography>{t?.('SearchResults')}</Typography>}
              columns={[
                {
                  id: 'name',
                  render: (name: string, { userId, ipn }: UserRecord) => `${name} (${userId}, ${ipn})`
                }
              ]}
              emptyDataText={t?.('EmptySearchResults')}
              data={
                searchResults && searchResults.filter(({ userId }) => !selected.includes(userId as string))
              }
              onRowClick={({ userId }: UserRecord) => this.setState({ selected: selected.concat(userId as string) })}
            />
          </>
        ) : null}
        <Toolbar disableGutters={true} className={classes.toolbar}>
          <div style={{ flexGrow: 1 }} />
          <Button
            variant="contained"
            color="primary"
            onClick={() => onChange?.(selected.length ? selected : null)}
          >
            {t?.('Apply')}
          </Button>
        </Toolbar>
      </Paper>
    );
  }
}

const mapState = ({ users }: { users: Record<string, UserRecord> }) => ({ users });

const mapDispatch = (dispatch: Dispatch) => ({
  actions: {
    searchUsers: bindActionCreators(searchUsers, dispatch)
  }
});

const styled = withStyles(styles)(UserIdsFilterHandler as never);
const translated = translate('UserIdsFilterHandler')(styled as never);
export default connect(mapState as never, mapDispatch)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
