import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';
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

interface Unit {
  id?: number;
  [key: string]: unknown;
}

interface DebugToolsProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  actions: { toggleDebugMode: () => void };
  userUnits: Unit[];
  template?: unknown;
  debugTools?: Record<string, React.ReactNode>;
}

interface DebugToolsState {
  activeTool: number;
  onlyMocUnit: Unit | undefined;
  curatorUnit: boolean;
}

class DebugTools extends React.Component<DebugToolsProps, DebugToolsState> {
  constructor(props: DebugToolsProps) {
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

  setActiveTool = (event: unknown, activeTool: number) => {
    storage.setItem('activeTool', `${activeTool}`);
    this.setState({ activeTool });
  };

  getTools = (): Record<string, React.ReactNode> => {
    const { debugTools, template } = this.props;
    const { onlyMocUnit, curatorUnit } = this.state;

    let concatTools: Record<string, React.ReactNode> = {
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

const mapStateToProps = ({ auth: { info: userInfo, userUnits } }: { auth: { info: unknown; userUnits: Unit[] } }) => ({
  userInfo,
  userUnits,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    toggleDebugMode: bindActionCreators(toggleDebugMode, dispatch),
  },
});

const styled = withStyles(styles)(DebugTools as never);
const translated = translate('DebugTools')(styled as never);

export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
