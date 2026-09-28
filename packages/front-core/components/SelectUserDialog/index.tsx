import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import classNames from 'classnames';
import {
  Dialog,
  DialogContent,
  TextField,
  Select,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import ProgressLine from 'components/Preloader/ProgressLine';
import DataTable from 'components/DataTable';
import { searchUsers } from 'actions/users';
import waiter from 'helpers/waitForAction';

const SEARCH_INTERVAL = 500;

const styles = {
  toolbar: {
    padding: 0,
  },
  rawContent: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  debugToolsSearch: {
    marginRight: 20,
    minWidth: 300,
  },
  debugToolsSelect: {
    padding: 0,
  },
  debugToolsToolbar: {
    marginTop: 16,
    minHeight: 'unset',
    marginBottom: 16,
  },
  debugToolsRawContent: {
    paddingLeft: 16,
    paddingRight: 16,
  },
};

interface SelectUserDialogProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  isDialog?: boolean;
  isDebugTools?: boolean;
  open?: boolean;
  onClose?: () => void;
  onUserSelect: (user: Record<string, unknown>) => void;
  userInfo: { userId?: unknown };
  actions: { searchUsers: (params: Record<string, unknown>) => Promise<Record<string, unknown>[]> };
}

interface SelectUserDialogState {
  search: string;
  searchBy: string;
  searchResults: Record<string, unknown>[];
  searching: boolean;
}

class SelectUserDialog extends React.Component<SelectUserDialogProps, SelectUserDialogState> {
  static defaultProps = {
    isDialog: true,
    isDebugTools: false,
  };

  state: SelectUserDialogState = { search: '', searchBy: 'name', searchResults: [], searching: false };

  handleChangeSearchBy = ({ target: { value } }: { target: { value: string } }) => {
    const { searchBy } = this.state;

    if (searchBy === value) {
      return;
    }

    this.setState({ searchBy: value }, this.handleSearch);
  };

  handleChangeSearch = ({ target: { value } }: { target: { value: string } }) =>
    this.setState({ search: value }, this.handleSearch);

  handleSearch = () => {
    if (!this.state.search) {
      this.setState({ searchResults: [], searching: false });
      waiter.removeAction('user-list-search');
      return;
    }

    this.setState({ searching: true });
    waiter.addAction(
      'user-list-search',
      async () => {
        const { actions } = this.props;
        const { search, searchBy } = this.state;

        if (!search) {
          this.setState({ searchResults: [], searching: false });
          return;
        }

        const searchParams: Record<string, unknown> = {};

        switch (searchBy) {
          case 'ID':
            searchParams.userIds = [search];
            break;
          case 'IPN':
            searchParams.code = search;
            break;
          default:
            searchParams.search = search;
            break;
        }

        const searchResults = await actions.searchUsers(searchParams);

        this.setState({
          searchResults: (searchResults || []).filter(Boolean),
          searching: false,
        });
      },
      SEARCH_INTERVAL,
    );
  };

  renderToolbar = () => {
    const { search, searchBy } = this.state;
    const { t, classes, isDebugTools } = this.props;

    return (
      <Toolbar
        className={classNames({
          [classes.toolbar]: true,
          [classes.debugToolsToolbar]: isDebugTools,
        })}
      >
        <TextField
          variant={isDebugTools ? 'outlined' : 'standard'}
          placeholder={t('Search')}
          margin="none"
          value={search}
          onChange={this.handleChangeSearch}
          className={isDebugTools ? classes.debugToolsSearch : undefined}
        />
        <Select
          variant={isDebugTools ? 'outlined' : 'standard'}
          classes={{
            select: isDebugTools ? classes.debugToolsSelect : undefined,
          }}
          value={searchBy}
          onChange={this.handleChangeSearchBy as never}
        >
          <MenuItem value="name">{t('SearchByName')}</MenuItem>
          <MenuItem value="IPN">{t('SearchByIPN')}</MenuItem>
          <MenuItem value="ID">{t('SearchByID')}</MenuItem>
        </Select>
      </Toolbar>
    );
  };

  renderSearchTable = () => {
    const { t, onUserSelect, userInfo, isDebugTools } = this.props;
    const { searchResults, searching } = this.state;

    if (searching) {
      return <ProgressLine />;
    }

    return (
      <DataTable
        emptyDataText={t('EmptySearchResults')}
        data={searchResults.filter(({ userId }) => userId !== userInfo.userId)}
        columns={[
          {
            id: 'userId',
            width: 50,
            render: () => <AccountCircleOutlinedIcon />,
          },
          {
            id: 'name',
            render: (name: string, { userId }: { userId: unknown }) => (
              <Typography variant="body1">{`${name} (${userId})`}</Typography>
            ),
          },
        ]}
        controls={{
          pagination: false,
          toolbar: !isDebugTools,
          search: false,
          header: false,
          refresh: false,
          switchView: false,
        }}
        onRowClick={onUserSelect}
      />
    );
  };

  render() {
    const { classes, open, onClose, isDialog, isDebugTools } = this.props;

    if (isDialog) {
      return (
        <Dialog onClose={onClose} open={open as boolean} fullWidth={true} maxWidth="md">
          <DialogContent>
            {this.renderToolbar()}
            {this.renderSearchTable()}
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <div
        className={classNames({
          [classes.rawContent]: true,
          [classes.debugToolsRawContent]: isDebugTools,
        })}
      >
        {this.renderToolbar()}
        {this.renderSearchTable()}
      </div>
    );
  }
}

const mapStateToProps = ({ auth: { info } }: { auth: { info: { userId?: unknown } } }) => ({ userInfo: info });
const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    searchUsers: bindActionCreators(searchUsers, dispatch),
  },
});

const styled = withStyles(styles)(SelectUserDialog as never);
const translated = translate('SelectUserDialog')(styled as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
