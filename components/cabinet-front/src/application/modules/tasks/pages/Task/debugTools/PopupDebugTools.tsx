/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import withStyles from '@mui/styles/withStyles';
import { translate } from 'react-translate';
import AceEditor from 'react-ace';
import SplitPane from 'react-split-pane';

import 'ace-builds/webpack-resolver';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-twilight';

const styles = {
  root: {
    display: 'flex',
    height: '100%'
  },
  rightContainer: {
    display: 'flex',
    height: '100%',
    flexDirection: 'column',
    paddingLeft: 2
  },
  funcContainer: {
    flex: 1
  }
};

const LegacySplitPane = SplitPane as any;

const PopupDebugTools = ({ classes, rootDocument, data, schema }: any) => (
  <div className={classes.root}>
    <LegacySplitPane split="vertical" minSize="50%">
      <AceEditor
        mode="json"
        theme="twilight"
        fontSize={14}
        showPrintMargin={true}
        showGutter={true}
        highlightActiveLine={true}
        value={JSON.stringify(rootDocument && rootDocument.data, null, 4)}
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
        <div className={classes.funcContainer}>
          <AceEditor
            mode="json"
            theme="twilight"
            fontSize={14}
            showPrintMargin={true}
            showGutter={true}
            highlightActiveLine={true}
            value={JSON.stringify(data, null, 4)}
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
        </div>
        <div className={classes.funcContainer}>
          <AceEditor
            mode="json"
            theme="twilight"
            fontSize={14}
            showPrintMargin={true}
            showGutter={true}
            highlightActiveLine={true}
            value={JSON.stringify(schema, null, 4)}
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
        </div>
      </div>
    </LegacySplitPane>
  </div>
);

const styled = withStyles(styles as any)(PopupDebugTools as any);
const translated = translate('DebugTools')(styled as any);
export default withStyles(styles as any)(translated as any);
