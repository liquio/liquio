import React from 'react';
import { bindActionCreators } from 'redux';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { Button, Paper, TextField, Toolbar, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import GroupIcon from '@mui/icons-material/Group';

import { DataTableStated } from 'components/DataTable';
import FilterHandler from 'components/DataTable/components/FilterHandler';
import waiter from 'helpers/waitForAction';
import { getShortNameFromString } from 'helpers/getUserShortName';
import { searchUsers } from 'actions/users';

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    padding: 8
  },
  toolbar: {
    alignItems: 'flex-end'
  }
};

class UserIdsFilterHandler extends FilterHandler {
  constructor(props) {
    super(props);

    this.state = {
      search: '',
      searchResults: null,
      selected: props.value || []
    };
  }

  renderIcon = () => <GroupIcon />;

  renderChip = () => {
    const { t, name, value = [], users } = this.props;
    const userList = value.map((userId) => users[userId] || userId);
    const userListStringified = userList
      .slice(0, 3)
      .map((user) => {
        if (user.userId) {
          return getShortNameFromString(user.name);
        }
        return user;
      })
      .concat(userList.length > 3 && t('Others', { length: userList.length - 3 }))
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
    const { users, actions, onChange } = this.props;
    const { selected } = this.state;

    const notListedUsers = selected.filter((userId) => !users[userId]);

    if (!notListedUsers.length) {
      return;
    }

    let results = await actions.searchUsers({ ids: notListedUsers });
    if (results instanceof Error) results = [];
    const notStoredUsers = notListedUsers.filter(
      (id) => !results.find(({ userId }) => userId === id)
    );
    if (notStoredUsers.length) {
      onChange(selected.filter((userId) => !notStoredUsers.includes(userId)));
    }
  };

  handleSearch = () => {
    const { actions } = this.props;
    const { search } = this.state;

    if (search.length < 2) {
      return;
    }

    this.setState({ searchResults: null });
    waiter.addAction(
      'UserIdsFilterHandler',
      async () => {
        this.setState({ searchResults: null });
        const searchResults = await actions.searchUsers({ search });
        this.setState({ searchResults });
      },
      1000
    );
  };

  renderHandler() {
    const { t, classes, users, onChange, type } = this.props;
    const { search, selected, searchResults } = this.state;

    return (
      <Paper elevation={0} className={classes.root}>
        <TextField
          variant="standard"
          autoFocus={true}
          value={search}
          placeholder={t('Search')}
          onChange={({ target: { value: newValue } }) =>
            this.setState({ search: newValue }, this.handleSearch)
          }
          type={type}
        />
        <DataTableStated
          controls={{ toolbar: false }}
          columns={[
            {
              id: 'userId',
              render: (value, user) => {
                if (value) {
                  const { name, userId, ipn } = user;
                  return `${name} (${userId}, ${ipn})`;
                }
                return user;
              }
            }
          ]}
          data={selected.map((userId) => users[userId] || userId)}
          emptyDataText={t('EmptySelection')}
          onRowClick={(user) =>
            this.setState({
              selected: selected.filter((id) => id !== (user.userId || user))
            })
          }
        />
        {search ? (
          <>
            <DataTableStated
              controls={{ toolbar: true }}
              CustomToolbar={() => <Typography>{t('SearchResults')}</Typography>}
              columns={[
                {
                  id: 'name',
                  render: (name, { userId, ipn }) => `${name} (${userId}, ${ipn})`
                }
              ]}
              emptyDataText={t('EmptySearchResults')}
              data={
                searchResults && searchResults.filter(({ userId }) => !selected.includes(userId))
              }
              onRowClick={({ userId }) => this.setState({ selected: selected.concat(userId) })}
            />
          </>
        ) : null}
        <Toolbar disableGutters={true} className={classes.toolbar}>
          <div style={{ flexGrow: 1 }} />
          <Button
            variant="contained"
            color="primary"
            onClick={() => onChange(selected.length ? selected : null)}
          >
            {t('Apply')}
          </Button>
        </Toolbar>
      </Paper>
    );
  }
}

const mapState = ({ users }) => ({ users });

const mapDispatch = (dispatch) => ({
  actions: {
    searchUsers: bindActionCreators(searchUsers, dispatch)
  }
});

const styled = withStyles(styles)(UserIdsFilterHandler);
const translated = translate('UserIdsFilterHandler')(styled);
export default connect(mapState, mapDispatch)(translated);
