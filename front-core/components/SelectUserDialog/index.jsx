import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
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

class SelectUserDialog extends React.Component {
  state = { search: '', searchBy: 'name', searchResults: [], searching: false };

  handleChangeSearchBy = ({ target: { value } }) => {
    const { searchBy } = this.state;

    if (searchBy === value) {
      return;
    }

    this.setState({ searchBy: value }, this.handleSearch);
  };

  handleChangeSearch = ({ target: { value } }) =>
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

        const searchParams = {};

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
          className={isDebugTools ? classes.debugToolsSearch : null}
        />
        <Select
          variant={isDebugTools ? 'outlined' : 'standard'}
          classes={{
            select: isDebugTools ? classes.debugToolsSelect : null,
          }}
          value={searchBy}
          onChange={this.handleChangeSearchBy}
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
            render: (name, { userId }) => (
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
        <Dialog onClose={onClose} open={open} fullWidth={true} maxWidth="md">
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

SelectUserDialog.propTypes = {
  isDialog: PropTypes.bool,
  isDebugTools: PropTypes.bool,
};

SelectUserDialog.defaultProps = {
  isDialog: true,
  isDebugTools: false,
};

const mapStateToProps = ({ auth: { info } }) => ({ userInfo: info });
const mapDispatchToProps = (dispatch) => ({
  actions: {
    searchUsers: bindActionCreators(searchUsers, dispatch),
  },
});

const styled = withStyles(styles)(SelectUserDialog);
const translated = translate('SelectUserDialog')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
