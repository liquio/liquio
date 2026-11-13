import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
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
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { searchUsers } from 'actions/users';
import waiter from 'helpers/waitForAction';
import StringElement from 'components/JsonSchema/elements/StringElement';
import UserTable from './UserTable';

const SEARCH_INTERVAL = 500;

const styles = (theme: Theme) => ({
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
    fill: (theme as unknown as { buttonBg?: string }).buttonBg,
    marginRight: 6,
  },
});

const ColorButton = withStyles((theme: Theme) => ({
  root: {
    marginLeft: 30,
    marginRight: 60,
    color: (theme as unknown as { buttonBg?: string }).buttonBg,
    background: (theme as unknown as { searchInputBg?: string }).searchInputBg,
    borderRadius: 4,
    paddingLeft: 10,
    '&:hover': {
      background: (theme as unknown as { listHover?: string }).listHover,
    },
  },
}))(Button);

interface UserRecord {
  userId: string | number;
  ipn?: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  [key: string]: unknown;
}

interface UserListProps extends WithStyles<typeof styles> {
  t: (key: string) => string;
  value?: Record<string, string | number>;
  users: Record<string | number, UserRecord>;
  actions: { searchUsers: (searchParams: unknown, query?: string) => Promise<UserRecord[] | Error> };
  onChange: (event: InstanceType<typeof ChangeEvent>) => void;
  addButtonText?: string;
  emptyListText?: string;
  filterText?: string;
  deleteAction?: (params: { userId: string | number; path: unknown; callback: (actualList: unknown[] | null) => void }) => Promise<void>;
  addAction?: (params: { userId: string | number; path: unknown; callback: (actualList: unknown[] | null) => void }) => Promise<void>;
  path?: unknown;
  darkTheme?: boolean;
  autocompleteFilters?: boolean;
  controls?: Record<string, unknown>;
  toolbarAction?: boolean;
  dialogTitle?: string;
  readOnly?: boolean;
}

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
}: UserListProps) => {
  const [triggered, setTriggered] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('');
  const [searchResults, setSearchResult] = React.useState<UserRecord[] | null>([]);
  const [searchBy, setSearchBy] = React.useState('name');
  const [userList, setUserList] = React.useState<Array<string | number>>(
    Object.values(value || {}).filter(Boolean),
  );

  React.useEffect(() => {
    if (
      !_.difference(value, userList).length &&
      !_.difference(userList, value).length
    ) {
      return;
    }
    onChange(new ChangeEvent(userList, true, false) as InstanceType<typeof ChangeEvent>);
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

        const searchParams: Record<string, unknown> = {};

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
          return (score as number) < 0.5;
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
        data={filteredData as UserRecord[]}
        emptyDataText={emptyListText || t('EmptySelectedUsers')}
        controls={controls}
        CustomToolbar={toolbarAction ? CustomToolbar : null}
        UserAction={({ userId }: UserRecord) => (
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
                      setUserList((actualList.filter(Boolean)) as Array<string | number>);
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
        {...({ darkTheme } as Record<string, unknown>)}
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
                setSearchBy(newSearchBy as string)
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
                (searchResults &&
                searchResults.filter(({ userId }) => !userList.includes(userId))) || null
              }
              shortInfo={true}
              UserAction={({ userId }: UserRecord) => (
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
                            setUserList((actualList.filter(Boolean)) as Array<string | number>);
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

const mapStateToProps = ({ users }: { users: Record<string | number, UserRecord> }) => ({ users });

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    searchUsers: bindActionCreators(searchUsers, dispatch) as unknown as (searchParams: unknown, query?: string) => Promise<UserRecord[] | Error>,
  },
});

const styled = withStyles(styles)(UserList);
const connected = connect(mapStateToProps, mapDispatchToProps)(styled);
export default formElement(connected as unknown as React.ComponentType<Record<string, unknown>>);
