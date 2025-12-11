import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import CodeIcon from '@mui/icons-material/Code';
import SplitPane from 'react-split-pane';

import Editor from 'components/Editor';
import FunctionEditor from 'components/CodeEditDialog/FunctionEditor';
import useSelectionMonacoEditor from 'components/CodeEditDialog/hooks/useSelectionMonacoEditor';
import useJson5Validator from 'components/CodeEditDialog/hooks/useJson5Validator';

import { useUserSettings } from 'components/UserSettings';

export const defaultHtml = (defaultHtmlValue) =>
  defaultHtmlValue
    ? `<!DOCTYPE html>
<html lang="uk">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
    <style>
      body {
        font-size: 12px;
        margin: 0;
        font-family: 'e-Ukraine', Arial, Helvetica, sans-serif;
        line-height: 1;
        padding-right: 80px;
        padding-left: 80px;
        padding-top: 56px;
        padding-bottom: 56px;
        letter-spacing: -0.02em;
      }
    </style>
  </head>
  <body>
    
  </body>
</html>`
    : '';

const styles = (theme) => ({
  header: {
    padding: 0,
    backgroundColor: '#232323',
    minHeight: 32
  },
  title: {
    flexGrow: 1,
    color: '#E2E2E2',
    padding: '0 10px'
  },
  button: {
    color: '#E2E2E2!important'
  },
  dialog: {
    display: 'flex',
    '& .ace_editor': {
      flex: 1
    }
  },
  paper: {
    position: 'fixed',
    background: '#fff',
    zIndex: 1000,
    maxHeight: 300,
    overflow: 'auto'
  },
  editor: {
    flexGrow: 1,
    overflow: 'hidden'
  },
  tabs: {
    backgroundColor: '#232323',
    margin: 0
  },
  tab: {
    color: '#fff'
  },
  codeButton: {
    position: 'absolute',
    color: '#ffffff'
  },
  editorContainer: {
    width: '100%',
    height: '100%',
    position: 'relative'
  },
  suggestText: {
    color: '#fff',
    background: theme?.header?.background,
    cursor: 'pointer',
    '&:hover': {
      opacity: 0.7
    }
  }
});

const MonacoEditor = ({
  mode,
  classes,
  value,
  onChange,
  handleSave,
  readOnly,
  defaultHtmlValue,
  onValidate
}) => {
  const [functionEditorData, setFunctionEditorData] = React.useState(null);
  const [editorInstance, setEditorInstance] = React.useState(null);
  const { settings } = useUserSettings('editor');

  useJson5Validator(editorInstance);

  const updateSelectedData = (editor) => {
    const position = editor.getPosition();

    setSelection({
      anchor: { column: position.column, row: position.lineNumber }
    });
  };

  const handleEditorDidMount = (editor) => {
    setEditorInstance(editor);
    const cursorListener = editor.onDidChangeCursorPosition(() => updateSelectedData(editor));

    return () => {
      cursorListener.dispose();
    };
  };

  const {
    language,
    functionRow,
    functionName,
    functionBody,
    setSelection,
    cursorPosition,
    onFunctionChange,
    saveEditorScrollTop
  } = useSelectionMonacoEditor(editorInstance);

  const setDefaultValue = (value, mode) => {
    if (!mounted && mode === 'html' && !value.length) {
      return defaultHtml(defaultHtmlValue);
    }

    return value || '';
  };

  const editorContainer = (
    <div className={classes.editorContainer}>
      <Editor
        width="100%"
        onChange={onChange}
        handleSave={handleSave}
        language={mode === 'visual' || mode === 'json5' ? 'json' : mode}
        theme={settings?.options?.theme || 'vs-dark'}
        value={setDefaultValue(value, mode)}
        options={{
          ...(settings?.options || {}),
          readOnly: readOnly
        }}
        onValidate={onValidate}
        onMount={handleEditorDidMount}
      />
    </div>
  );

  return (
    <>
      {functionEditorData ? (
        <SplitPane minSize="50%">
          {editorContainer}
          <FunctionEditor
            {...functionEditorData}
            readOnly={readOnly}
            schemaValue={value}
            onChange={onFunctionChange}
            onSchemaChange={onChange}
            onClose={() => {
              saveEditorScrollTop();
              setFunctionEditorData();
            }}
          />
        </SplitPane>
      ) : editorContainer}

      {functionBody ? (
        <IconButton
          className={classes.codeButton}
          onClick={() => {
            saveEditorScrollTop();
            setFunctionEditorData({ functionRow, functionName, functionBody, language });
          }}
          style={
            cursorPosition && {
              top: cursorPosition.top + (Editor ? -40 : 0),
              left: cursorPosition.left
            }
          }
          size="large"
        >
          <CodeIcon />
        </IconButton>
      ) : null}
    </>
  );
};

MonacoEditor.propTypes = {
  classes: PropTypes.object.isRequired,
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onChange: PropTypes.func,
  onValidate: PropTypes.func,
  value: PropTypes.string,
  description: PropTypes.string,
  mode: PropTypes.string,
  schema: PropTypes.object,
  handleSave: PropTypes.func,
  handleSaveButton: PropTypes.func,
  readOnly: PropTypes.bool,
  defaultHtmlValue: PropTypes.bool
};

MonacoEditor.defaultProps = {
  open: false,
  onClose: () => null,
  onChange: () => null,
  onValidate: () => null,
  value: '',
  description: '',
  mode: 'json5',
  schema: null,
  handleSave: () => null,
  handleSaveButton: () => null,
  readOnly: false,
  defaultHtmlValue: true
};

const styled = withStyles(styles)(MonacoEditor);

export default translate('Elements')(styled);
