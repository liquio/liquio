import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Chip, Hidden } from '@mui/material';
import withStyles from '@mui/styles/withStyles';

import storage from 'helpers/storage';
import processList from 'services/processList';
import Preloader from 'components/Preloader';
import { resetState } from 'actions/app';
import { searchUsers } from 'actions/users';

const styles = {
  chip: {
    height: 40,
    borderRadius: 20,
    color: 'inherit'
  },
  deleteIcon: {
    margin: '0 6px 0 -8px'
  }
};

interface UserRecord {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

interface CuratorProps {
  classes: Record<string, string>;
  users: Record<string, UserRecord>;
  actions: {
    resetState: () => unknown;
    searchUsers: (params: { userIds: string[] }) => unknown;
  };
}

class Curator extends React.Component<CuratorProps> {
  init = () => {
    const { actions } = this.props;
    const debugUser = this.getUser();

    if (!debugUser.id || debugUser.name) return;

    processList.hasOrSet('searchUsers', actions.searchUsers as never, {
      userIds: [debugUser.id]
    });
  };

  getUser = (): UserRecord => {
    const { users } = this.props;
    const debugUserId = storage.getItem('debug-user-id') as string;
    return { ...users[debugUserId], id: debugUserId };
  };

  handleClearUser = () => {
    const { actions } = this.props;
    storage.removeItem('debug-user-id');
    actions.resetState();
  };

  componentDidMount = () => this.init();

  componentDidUpdate = () => this.init();

  render = () => {
    const { classes } = this.props;
    const debugUser = this.getUser();

    if (debugUser && !debugUser.name && !debugUser.id) return null;

    if (debugUser.id && !debugUser.name) return <Preloader nopadding={true} {...({ size: '32' } as unknown as Record<string, unknown>)} />;

    return (
      <Hidden mdDown={true} implementation="css">
        <Chip
          className={classes.chip}
          classes={{ deleteIcon: classes.deleteIcon }}
          label={debugUser.name}
          variant="outlined"
          onDelete={(debugUser.id && this.handleClearUser) as unknown as (() => void) | undefined}
        />
      </Hidden>
    );
  };
}

const mapStateToProps = ({ users }: { users: Record<string, UserRecord> }) => ({ users });
const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    resetState: bindActionCreators(resetState, dispatch),
    searchUsers: bindActionCreators(searchUsers, dispatch)
  }
});

const styled = withStyles(styles)(Curator as never);
const translated = translate('AdminTools')(styled as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
