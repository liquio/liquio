import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import { Toolbar, Tabs, Tab, IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import CloseIcon from '@mui/icons-material/Close';
import Scrollbar from 'components/Scrollbar';
import { toggleDebugMode } from 'actions/auth';
import storage from 'helpers/storage';

import tools from './tools';

const styles = {
  root: {
    height: '100%',
  },
  header: {
    borderBottom: 'rgb(199, 199, 199) 1px solid',
    background: '#f1f1f1',
    minHeight: 'unset',
    padding: '0 10px',
  },
  tabs: {
    flexGrow: 1,
    margin: 0,
    minHeight: 'auto',
    borderBottom: 'none',
  },
  tab: {
    minHeight: 31,
    fontSize: 12,
    margin: 0,
  },
  toolContainer: {
    height: 'calc(100% - 32px)',
  },
  indicator: {
    display: 'none',
  },
};

class DebugTools extends React.Component {
  constructor(props) {
    super(props);
    const onlyMocUnit = this.props.userUnits.find(
      (item) => item?.id === 1000000190,
    );
    const curatorUnit = this.props.userUnits.some(
      (item) => item?.id === 1000001 || item?.id === 1000000041,
    );
    const checkedTool = Number(storage.getItem('activeTool'));
    this.state = {
      activeTool: checkedTool || (onlyMocUnit ? 0 : 2),
      onlyMocUnit,
      curatorUnit,
    };
  }

  setActiveTool = (event, activeTool) => {
    storage.setItem('activeTool', `${activeTool}`);
    this.setState({ activeTool });
  };

  getTools = () => {
    const { debugTools, template } = this.props;
    const { onlyMocUnit, curatorUnit } = this.state;

    let concatTools = {
      AuthTools: tools.AuthTools,
      ...debugTools,
      CustomInterfaceCheck: tools.CustomInterfaceCheck,
      ExternalReaderMocks: tools.ExternalReaderMocks(template),
      EDSFormTest: tools.EDSFormTest,
      EDSSignVerify: tools.EDSSignVerify,
      HashToInternal: tools.HashToInternal,
      VerifyHash: tools.VerifyHash,
    };

    if (curatorUnit) {
      concatTools = {
        AuthTools: tools.AuthTools,
        Curator: tools.Curator,
        ...concatTools,
      };
    }

    if (onlyMocUnit) {
      return { ExternalReaderMocks: tools.ExternalReaderMocks(template) };
    }

    return concatTools;
  };

  render() {
    const { t, classes, actions } = this.props;
    const { activeTool } = this.state;

    const debugTools = this.getTools();
    const activeToolComponent = Object.values(debugTools)[activeTool];

    return (
      <div className={classes.root}>
        <Toolbar className={classes.header}>
          <Tabs
            className={classes.tabs}
            classes={{ indicator: classes.indicator }}
            value={activeTool}
            onChange={this.setActiveTool}
            variant="scrollable"
            scrollButtons="auto"
          >
            {Object.keys(debugTools).map((toolName) => (
              <Tab className={classes.tab} key={toolName} label={t(toolName)} />
            ))}
          </Tabs>
          <IconButton
            className={classes.button}
            onClick={actions.toggleDebugMode}
          >
            <CloseIcon />
          </IconButton>
        </Toolbar>
        <div className={classes.toolContainer}>
          <Scrollbar>{activeToolComponent || null}</Scrollbar>
        </div>
      </div>
    );
  }
}

DebugTools.propTypes = {
  classes: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
};

DebugTools.defaultProps = {};

const mapStateToProps = ({ auth: { info: userInfo, userUnits } }) => ({
  userInfo,
  userUnits,
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    toggleDebugMode: bindActionCreators(toggleDebugMode, dispatch),
  },
});

const styled = withStyles(styles)(DebugTools);
const translated = translate('DebugTools')(styled);

export default connect(mapStateToProps, mapDispatchToProps)(translated);
