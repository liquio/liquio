/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Dialog, Toolbar, IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import AceEditor from 'react-ace';
import ReactResizeDetector from 'react-resize-detector';
import SplitPane from 'react-split-pane';

import evaluate from 'helpers/evaluate';
import { setCheckHiddenFunc } from 'actions/debugTools';

import 'ace-builds/webpack-resolver';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-twilight';

const styles = {
  root: {
    display: 'flex',
    height: '100%',
    '& > div': {
      flex: '.5'
    }
  },
  rightContainer: {
    display: 'flex',
    height: '100%',
    flexDirection: 'column',
    paddingLeft: 2
  },
  funcContainer: {
    flex: 1
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'flex-end',
    minHeight: 40
  },
  iconButton: {
    width: 26,
    height: 26,
    padding: 1
  }
};

const LegacySplitPane = SplitPane as any;
const LegacyResizeDetector = ReactResizeDetector as any;

class CheckHiddenFunction extends React.Component<any, any> {
  aceComponentInput: React.RefObject<any>;
  aceComponentOutput: React.RefObject<any>;
  aceComponentOriginData: React.RefObject<any>;

  constructor(props: any) {
    super(props);
    this.state = { open: false };
    this.aceComponentInput = React.createRef();
    this.aceComponentOutput = React.createRef();
    this.aceComponentOriginData = React.createRef();
  }

  handleChangeFunc = (value: string) => {
    const { actions, task } = this.props;
    actions.setCheckHiddenFunc(task.id, value);
  };

  handleCheckFunc = () => {
    const { task, checkHiddenFuncs } = this.props;

    if (!checkHiddenFuncs[task.id]) {
      return '';
    }

    const result = evaluate(checkHiddenFuncs[task.id], task.document.data);
    if (result instanceof Error) {
      return '';
    }
    return result;
  };

  onResize = () => {
    this.aceComponentInput.current.editor.resize();
    this.aceComponentOutput.current.editor.resize();
    this.aceComponentOriginData.current.editor.resize();
  };

  openModal = () => this.setState({ open: true });

  closeModal = () => this.setState({ open: false });

  render() {
    const { t, classes, task, checkHiddenFuncs } = this.props;
    const { open } = this.state;

    return (
      <div className={classes.root}>
        <LegacySplitPane split="vertical" minSize="50%">
          <AceEditor
            ref={this.aceComponentOriginData}
            mode="json"
            theme="twilight"
            fontSize={14}
            showPrintMargin={true}
            showGutter={true}
            highlightActiveLine={true}
            value={JSON.stringify(task && task.document.data, null, 4)}
            width="100%"
            height="100%"
            readOnly={true}
            setOptions={{
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              enableSnippets: true,
              showLineNumbers: true,
              tabSize: 4
            }}
          />
          <div className={classes.rightContainer}>
            <LegacyResizeDetector handleHeight={true} onResize={this.onResize} />
            <div className={classes.funcContainer}>
              {t('Function')}
              <IconButton onClick={this.openModal} className={classes.iconButton} size="large">
                <FullscreenIcon />
              </IconButton>
              <AceEditor
                ref={this.aceComponentInput}
                mode="javascript"
                theme="twilight"
                fontSize={14}
                showPrintMargin={true}
                showGutter={true}
                highlightActiveLine={true}
                value={checkHiddenFuncs[task && task.id] || ''}
                width="100%"
                height="calc(100% - 24px)"
                readOnly={false}
                onChange={this.handleChangeFunc}
                wrapEnabled={true}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  enableSnippets: true,
                  showLineNumbers: true,
                  tabSize: 4
                }}
              />
            </div>
            <div className={classes.funcContainer}>
              {t('Result')}
              <AceEditor
                ref={this.aceComponentOutput}
                mode="json"
                theme="twilight"
                fontSize={14}
                showPrintMargin={true}
                showGutter={true}
                highlightActiveLine={true}
                value={JSON.stringify(this.handleCheckFunc(), null, 4)}
                width="100%"
                height="calc(100% - 18px)"
                readOnly={false}
                onChange={this.handleChangeFunc}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  enableSnippets: true,
                  showLineNumbers: true,
                  tabSize: 4
                }}
              />
            </div>
          </div>
        </LegacySplitPane>
        <Dialog open={open} fullScreen={true} fullWidth={true}>
          <Toolbar className={classes.toolbar}>
            <IconButton onClick={this.closeModal} size="large">
              <CloseIcon />
            </IconButton>
          </Toolbar>
          <AceEditor
            mode="javascript"
            theme="twilight"
            fontSize={14}
            showPrintMargin={true}
            showGutter={true}
            highlightActiveLine={true}
            value={checkHiddenFuncs[task.id] || ''}
            width="100%"
            height="calc(100% - 18px)"
            readOnly={false}
            onChange={this.handleChangeFunc}
            wrapEnabled={true}
            setOptions={{
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              enableSnippets: true,
              showLineNumbers: true,
              tabSize: 4
            }}
          />
        </Dialog>
      </div>
    );
  }
}

const mapStateToProps = ({ debugTools: { checkHiddenFuncs } }: any) => ({
  checkHiddenFuncs
});

const mapDispatchToProps = (dispatch: any) => ({
  actions: {
    setCheckHiddenFunc: bindActionCreators(setCheckHiddenFunc, dispatch)
  }
});

const styled = withStyles(styles as any)(CheckHiddenFunction as any);
const translated = translate('DebugTools')(styled as any);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
