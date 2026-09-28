import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
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

interface CuratorProps {
  users: Record<string, { name?: string; [key: string]: unknown }>;
  classes: Record<string, string>;
  actions: {
    resetState: () => void;
    searchUsers: (searchData: unknown) => void;
  };
}

class Curator extends React.Component<CuratorProps> {
  init = () => {
    const { actions } = this.props;
    const debugUser = this.getUser();
    if (!debugUser.id || debugUser.name) {
      return;
    }

    processList.hasOrSet('searchUsers', actions.searchUsers as never, {
      userIds: [debugUser.id],
    });
  };

  getUser = () => {
    const { users } = this.props;
    const debugUserId = storage.getItem('debug-user-id') as string;
    return { ...users[debugUserId], id: debugUserId };
  };

  handleClearUser = () => {
    const { actions } = this.props;
    storage.removeItem('debug-user-id');
    actions.resetState();
  };

  handleSelectUser = ({ userId }: { userId: string }) => {
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
            onDelete={debugUser.id ? this.handleClearUser : undefined}
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

const mapStateToProps = ({ users, auth: { debugMode, userUnits, info } }: {
  users: Record<string, unknown>;
  auth: { debugMode: unknown; userUnits: unknown; info: unknown };
}) => ({
  users,
  debugMode,
  userUnits,
  userInfo: info,
});
const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    resetState: bindActionCreators(resetState, dispatch),
    searchUsers: bindActionCreators(searchUsers, dispatch),
  },
});

const styled = withStyles(styles)(Curator as never);
const translated = translate('AdminTools')(styled as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
