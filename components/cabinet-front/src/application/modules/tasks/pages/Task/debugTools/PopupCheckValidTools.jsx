import React from 'react';
import PropTypes from 'prop-types';
import { Select, MenuItem } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { translate } from 'react-translate';
import AceEditor from 'react-ace';
import SplitPane from 'react-split-pane';

import 'ace-builds/webpack-resolver';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-twilight';

import evaluate from 'helpers/evaluate';
import useStickyState from 'helpers/useStickyState';
import propertiesEach from 'components/JsonSchema/helpers/propertiesEach';

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

const PopupCheckValidTools = ({ classes, rootDocument, data, schema, pageData }) => {
  const [func, setFunc] = useStickyState('', 'PopupCheckValidToolsFunc');
  const [element, setElement] = useStickyState('', 'PopupCheckValidToolsElement');

  const elements = [];

  propertiesEach(schema, data, (propSchema, propData, path, parentSchema, parentData, key) => {
    key &&
      elements.push({
        schema: propSchema,
        data: propData,
        path,
        parentSchema,
        parentData,
        key
      });
  });

  const handleChange = (value, el) => {
    setFunc(value);
    setElement(el);
  };

  const propertyData = (data || {})[element];
  const result = evaluate(func, propertyData, pageData, rootDocument.data);

  return (
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
            <Select
              value={element || ''}
              onChange={({ target: { value } }) => handleChange(func, value)}
              fullWidth={true}
            >
              {elements.map((item) => (
                <MenuItem key={item.key} value={item.key}>
                  {[item.key, item.schema.description].filter(Boolean).join(' - ')}
                </MenuItem>
              ))}
            </Select>
            <AceEditor
              // mode="javascript"
              theme="twilight"
              fontSize={14}
              showPrintMargin={true}
              showGutter={true}
              highlightActiveLine={true}
              value={func}
              onChange={(value) => handleChange(value, element)}
              width="100%"
              height="calc(100% - 24px)"
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
              value={JSON.stringify(result === undefined ? `${result}` : result, null, 4)}
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
};

PopupCheckValidTools.propTypes = {
  classes: PropTypes.object.isRequired,
  rootDocument: PropTypes.object.isRequired,
  schema: PropTypes.object.isRequired,
  pageData: PropTypes.object.isRequired,
  data: PropTypes.object.isRequired
};

PopupCheckValidTools.defaultProps = {};

const styled = withStyles(styles)(PopupCheckValidTools);
const translated = translate('DebugTools')(styled);
export default withStyles(styles)(translated);
