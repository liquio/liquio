import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import _ from 'lodash/fp';
import Fuse from 'fuse.js';
import { ChangeEvent } from 'components/JsonSchema';
import formElement from 'components/JsonSchema/components/formElement';
import {
  Toolbar,
  Button,
  Dialog,
  DialogTitle,
  TextField,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { searchUsers } from 'actions/users';
import waiter from 'helpers/waitForAction';
import StringElement from 'components/JsonSchema/elements/StringElement';
import UserTable from './UserTable';

const SEARCH_INTERVAL = 500;

const styles = (theme) => ({
  header: {
    padding: 0,
    minHeight: 32,
    justifyContent: 'space-between',
    display: 'flex',
    paddingRight: 16,
  },
  button: {
    color: '#000',
  },
  dialogHeadline: {
    marginBottom: 10,
    marginTop: 20,
    fontSize: 32,
    fontWeight: 400,
    lineHeight: '38px',
    letterSpacing: '-0.02em',
  },
  resultsWrapper: {
    paddingBottom: 24,
    paddingLeft: 14,
    paddingRight: 14,
  },
  actionColor: {
    fill: theme.buttonBg,
    marginRight: 6,
  },
});

const ColorButton = withStyles((theme) => ({
  root: {
    marginLeft: 30,
    marginRight: 60,
    color: theme.buttonBg,
    background: theme.searchInputBg,
    borderRadius: 4,
    paddingLeft: 10,
    '&:hover': {
      background: theme.listHover,
    },
  },
}))(Button);

const UserList = ({
  t,
  classes,
  value,
  users,
  actions,
  onChange,
  addButtonText,
  emptyListText,
  filterText,
  deleteAction,
  addAction,
  path,
  darkTheme,
  autocompleteFilters,
  controls,
  toolbarAction,
  dialogTitle,
  readOnly,
}) => {
  const [triggered, setTriggered] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('');
  const [searchResults, setSearchResult] = React.useState([]);
  const [searchBy, setSearchBy] = React.useState('name');
  const [userList, setUserList] = React.useState(
    Object.values(value || {}).filter(Boolean),
  );

  React.useEffect(() => {
    if (
      !_.difference(value, userList).length &&
      !_.difference(userList, value).length
    ) {
      return;
    }
    onChange(new ChangeEvent(userList, true, false));
  }, [userList, value, onChange]);

  React.useEffect(() => {
    waiter.addAction(
      'user-list-search',
      async () => {
        if (!search) {
          setSearchResult([]);
          return;
        }

        setSearchResult(null);

        const searchParams = {};

        if (autocompleteFilters) {
          const searchValue = search;

          const isIpn =
            /^\d{8}$/.test(searchValue) || /^\d{10}$/.test(searchValue) || /^\d{10}-\d{8}$/.test(searchValue);
          const isId =
            searchValue.length === 24 && searchValue.split(' ').length === 1;

          if (isIpn) {
            searchParams.code = search;
          } else if (isId) {
            searchParams.ids = [search];
          } else {
            searchParams.search = search;
          }
        } else {
          switch (searchBy) {
            case 'ID':
              searchParams.ids = [search];
              break;
            case 'IPN':
              searchParams.code = search;
              break;
            default:
              searchParams.search = search;
              break;
          }
        }

        const results = await actions.searchUsers(
          searchParams,
          '?brief_info=true',
        );

        if (results instanceof Error) {
          setSearchResult([]);
          return;
        }

        setTriggered(true);

        setSearchResult((results || []).filter(Boolean));
      },
      SEARCH_INTERVAL,
    );
  }, [search, searchBy, actions, autocompleteFilters]);

  React.useEffect(() => {
    const fetchUsers = async () => {
      const notListedUsers = userList.filter((userId) => !users[userId]);

      if (!notListedUsers.length) return;

      await actions.searchUsers({ ids: notListedUsers }, '?brief_info=true');
    };

    fetchUsers();
  }, [userList, users, actions]);

  const usersData = userList.map((userId) => users[userId]);

  const fuse = new Fuse(usersData.filter(Boolean), {
    includeScore: true,
    minMatchCharLength: 1,
    shouldSort: true,
    threshold: 0.1,
    keys: ['email', 'phone', 'name', 'ipn', 'userId'],
  });

  const filteredData = filter
    ? fuse
        .search(filter)
        .filter((result) => {
          const { score } = result;
          return score < 0.5;
        })
        .map(({ item }) => item)
    : usersData;

  const CustomToolbar = () => (
    <>
      {readOnly ? null : (
        <ColorButton
          disableElevation={true}
          variant="contained"
          color="primary"
          onClick={() => setOpen(true)}
        >
          <AddIcon className={classes.actionColor} />
          {addButtonText || t('AddUsers')}
        </ColorButton>
      )}
    </>
  );

  return (
    <>
      {!toolbarAction ? (
        <>
          {readOnly ? null : (
            <Toolbar disableGutters={true}>
              <Button
                variant="contained"
                color="primary"
                disabled={readOnly}
                onClick={() => setOpen(true)}
                aria-label={addButtonText || t('AddUsers')}
              >
                {addButtonText || t('AddUsers')}
              </Button>
            </Toolbar>
          )}
        </>
      ) : null}

      {autocompleteFilters ? null : (
        <Toolbar disableGutters={true}>
          <TextField
            variant="standard"
            id="standard-name"
            placeholder={filterText || t('Search')}
            margin="none"
            value={filter}
            style={{ flexGrow: 1 }}
            onChange={({ target: { value: newFilter } }) =>
              setFilter(newFilter)
            }
          />
        </Toolbar>
      )}

      <UserTable
        darkTheme={darkTheme}
        data={filteredData}
        emptyDataText={emptyListText || t('EmptySelectedUsers')}
        controls={controls}
        CustomToolbar={toolbarAction ? CustomToolbar : null}
        UserAction={({ userId }) => (
          <>
            {readOnly ? null : (
              <Button
                color="secondary"
                onClick={async () => {
                  setUserList(userList.filter((id) => id !== userId));

                  if (!deleteAction) return;

                  await deleteAction({
                    userId,
                    path,
                    callback: (actualList) => {
                      if (!actualList) return;
                      setUserList(actualList.filter(Boolean));
                    },
                  });
                }}
                aria-label={t('Delete')}
              >
                <DeleteOutlineIcon />
              </Button>
            )}
          </>
        )}
      />

      <Dialog
        open={open}
        scroll="body"
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth={true}
        darkTheme={darkTheme}
      >
        <Toolbar className={classes.header}>
          <DialogTitle className={classes.dialogHeadline}>
            {dialogTitle || t('AddUsers')}
          </DialogTitle>
          <IconButton
            className={classes.button}
            onClick={() => setOpen(false)}
            aria-label={t('Close')}
          >
            <CloseIcon />
          </IconButton>
        </Toolbar>

        <Toolbar>
          <StringElement
            placeholder={filterText || t('SearchRegisteredUser')}
            margin="none"
            value={search}
            style={{ flexGrow: 1 }}
            darkTheme={darkTheme}
            variant={darkTheme ? 'outlined' : ''}
            noMargin={true}
            onChange={setSearch}
          />

          {autocompleteFilters ? null : (
            <Select
              variant="standard"
              value={searchBy}
              onChange={({ target: { value: newSearchBy } }) =>
                setSearchBy(newSearchBy)
              }
              aria-label={t('SearchBy')}
            >
              <MenuItem value="name">{t('SearchByName')}</MenuItem>
              <MenuItem value="IPN">{t('SearchByIPN')}</MenuItem>
              <MenuItem value="ID">{t('SearchByID')}</MenuItem>
            </Select>
          )}
        </Toolbar>

        <div className={classes.resultsWrapper}>
          {triggered ? (
            <UserTable
              darkTheme={darkTheme}
              emptyDataText={t('EmptySearchResults')}
              data={
                searchResults &&
                searchResults.filter(({ userId }) => !userList.includes(userId))
              }
              shortInfo={true}
              UserAction={({ userId }) => (
                <>
                  {readOnly ? null : (
                    <Button
                      color="secondary"
                      onClick={async () => {
                        setUserList(userList.concat(userId));

                        if (!addAction) return;

                        await addAction({
                          userId,
                          path,
                          callback: (actualList) => {
                            if (!actualList) return;
                            setUserList(actualList.filter(Boolean));
                          },
                        });
                      }}
                      aria-label={t('Add')}
                    >
                      <AddIcon />
                    </Button>
                  )}
                </>
              )}
            />
          ) : null}
        </div>
      </Dialog>
    </>
  );
};

const mapStateToProps = ({ users }) => ({ users });

const mapDispatchToProps = (dispatch) => ({
  actions: {
    searchUsers: bindActionCreators(searchUsers, dispatch),
  },
});

const styled = withStyles(styles)(UserList);
const connected = connect(mapStateToProps, mapDispatchToProps)(styled);
export default formElement(connected);
