import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Chip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import storage from 'helpers/storage';
import processList from 'services/processList';
import SelectUserDialog from 'components/SelectUserDialog';
import { resetState } from 'actions/app';
import { searchUsers } from 'actions/users';

const styles = {
  chip: {
    height: 40,
    borderRadius: 20,
    marginLeft: 20,
    marginTop: 20,
    marginBottom: 10,
    color: 'inherit',
  },
  deleteIcon: {
    margin: '0 6px 0 -8px',
  },
};

class Curator extends React.Component {
  init = () => {
    const { actions } = this.props;
    const debugUser = this.getUser();
    if (!debugUser.id || debugUser.name) {
      return;
    }

    processList.hasOrSet('searchUsers', actions.searchUsers, {
      userIds: [debugUser.id],
    });
  };

  getUser = () => {
    const { users } = this.props;
    const debugUserId = storage.getItem('debug-user-id');
    return { ...users[debugUserId], id: debugUserId };
  };

  handleClearUser = () => {
    const { actions } = this.props;
    storage.removeItem('debug-user-id');
    actions.resetState();
  };

  handleSelectUser = ({ userId }) => {
    const { actions } = this.props;
    storage.setItem('debug-user-id', userId);
    actions.resetState();
  };

  componentDidMount = () => this.init();

  componentDidUpdate = () => this.init();

  render() {
    const { classes } = this.props;
    const debugUser = this.getUser();

    const chosen = debugUser && debugUser.name && debugUser.id;

    return (
      <>
        {chosen ? (
          <Chip
            className={classes.chip}
            classes={{ deleteIcon: classes.deleteIcon }}
            label={debugUser.name}
            variant="outlined"
            onDelete={debugUser.id && this.handleClearUser}
          />
        ) : null}

        <SelectUserDialog
          onUserSelect={this.handleSelectUser}
          isDialog={false}
          isDebugTools={true}
        />
      </>
    );
  }
}

Curator.propTypes = {
  users: PropTypes.object.isRequired,
  classes: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
};

Curator.defaultProps = {};

const mapStateToProps = ({ users, auth: { debugMode, userUnits, info } }) => ({
  users,
  debugMode,
  userUnits,
  userInfo: info,
});
const mapDispatchToProps = (dispatch) => ({
  actions: {
    resetState: bindActionCreators(resetState, dispatch),
    searchUsers: bindActionCreators(searchUsers, dispatch),
  },
});

const styled = withStyles(styles)(Curator);
const translated = translate('AdminTools')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
