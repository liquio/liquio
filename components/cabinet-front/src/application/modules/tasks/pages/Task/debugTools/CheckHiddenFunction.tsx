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
import { useResizeDetector } from 'react-resize-detector';
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

// `react-resize-detector` v4's `<ReactResizeDetector>` render-prop component
// (which auto-detected its nearest DOM ancestor via `ReactDOM.findDOMNode`)
// was removed under React 19 — `findDOMNode` no longer exists. Converted
// from a class to a function component so the replacement
// `useResizeDetector()` hook can be used, with its `targetRef` pointed at
// the same `rightContainer` div the old detector auto-measured.
const CheckHiddenFunction = ({ t, classes, task, checkHiddenFuncs, actions }: any) => {
  const [open, setOpen] = React.useState(false);
  const aceComponentInput = React.useRef<any>(null);
  const aceComponentOutput = React.useRef<any>(null);
  const aceComponentOriginData = React.useRef<any>(null);
  const rightContainerRef = React.useRef<HTMLDivElement>(null);

  const handleChangeFunc = (value: string) => {
    actions.setCheckHiddenFunc(task.id, value);
  };

  const handleCheckFunc = () => {
    if (!checkHiddenFuncs[task.id]) {
      return '';
    }

    const result = evaluate(checkHiddenFuncs[task.id], task.document.data);
    if (result instanceof Error) {
      return '';
    }
    return result;
  };

  const onResize = React.useCallback(() => {
    aceComponentInput.current?.editor.resize();
    aceComponentOutput.current?.editor.resize();
    aceComponentOriginData.current?.editor.resize();
  }, []);

  useResizeDetector({ handleHeight: true, targetRef: rightContainerRef, onResize });

  const openModal = () => setOpen(true);

  const closeModal = () => setOpen(false);

  return (
    <div className={classes.root}>
      <LegacySplitPane split="vertical" minSize="50%">
        <AceEditor
          ref={aceComponentOriginData}
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
        <div className={classes.rightContainer} ref={rightContainerRef}>
          <div className={classes.funcContainer}>
            {t('Function')}
            <IconButton onClick={openModal} className={classes.iconButton} size="large">
              <FullscreenIcon />
            </IconButton>
            <AceEditor
              ref={aceComponentInput}
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
              onChange={handleChangeFunc}
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
              ref={aceComponentOutput}
              mode="json"
              theme="twilight"
              fontSize={14}
              showPrintMargin={true}
              showGutter={true}
              highlightActiveLine={true}
              value={JSON.stringify(handleCheckFunc(), null, 4)}
              width="100%"
              height="calc(100% - 18px)"
              readOnly={false}
              onChange={handleChangeFunc}
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
          <IconButton onClick={closeModal} size="large">
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
          onChange={handleChangeFunc}
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
};

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
