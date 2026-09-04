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

const PopupDebugTools = ({ classes, rootDocument, data, schema }) => (
  <div className={classes.root}>
    <SplitPane split="vertical" minSize="50%">
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
    </SplitPane>
  </div>
);

const styled = withStyles(styles)(PopupDebugTools);
const translated = translate('DebugTools')(styled);
export default withStyles(styles)(translated);
