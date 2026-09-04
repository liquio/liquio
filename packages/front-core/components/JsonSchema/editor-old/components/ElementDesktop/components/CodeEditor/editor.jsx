import { useCallback, useState } from 'react';
import FileSaver from 'file-saver';

import { makeStyles } from '@mui/styles';
import { IconButton } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import useSelectionMonacoEditor from 'components/JsonSchema/editor/components/ElementDesktop/components/CodeEditor/hooks/useSelectionMonacoEditor';

import Editor from 'components/Editor';

import { generateTechSpecBySchema } from 'application/actions/bpmnAi';
import { useControlDictionaryProvider } from 'components/Editor/hooks/useControlDictionaryProvider';
import { HtmlEditor } from './components/HtmlEditor';

import { addMessage } from 'actions/error';
import { useDispatch } from 'react-redux';

const useStyles = makeStyles({
  wrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#141414',
  },
  title: {
    padding: '10px 10px 10px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#ffffff',
  },
  closeBtn: {
    color: '#ffffff',
  },
  actions: {
    marginBottom: 0,
  },
  button: {
    color: '#ffffff',
  },
  actions: {
    position: 'absolute',
  },
});

const MonacoEditor = ({
  readOnly,
  onValidate,
  editorInstance,
  onSchemaChange,
  handleSave = () => null,
  setFunctionEditorData,
  onMount = () => null,
  value: defaultValue = '',
}) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const [value, setValue] = useState(defaultValue);

  const {
    language,
    functionRow,
    functionName,
    functionBody,
    setSelection,
    cursorPosition,
    onFunctionChange,
    saveEditorScrollTop,
  } = useSelectionMonacoEditor(editorInstance);

  const {
    setEditorInstance
  } = useControlDictionaryProvider(value);

  const handleEditorDidMount = useCallback((editor) => {
    onMount(editor);
    const scrollListener = setEditorInstance(editor);
    const cursorListener = editor.onDidChangeCursorPosition(() => {
      const position = editor.getPosition();

      setSelection({
        anchor: { column: position.column, row: position.lineNumber },
      });
    });

    if (!editor.getAction('generateTechSpecByJSONSchema')) {
      editor.addAction({
        id: 'generateTechSpecByJSONSchema',
        label: 'Generate tech-specification by JSON-schema',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1.6,
        run: async () => {
          await dispatch(generateTechSpecBySchema({ jsonSchema: value }))
            .then((res) => {
              if (res?.message) dispatch(addMessage(new Message(res.message, 'error')));
              FileSaver.saveAs(res);
            });
        },
      });
    }

    return () => {
      scrollListener.dispose();
      cursorListener.dispose();
    };
  }, [setEditorInstance]);

  return (
    <div className={classes.wrapper}>
      <Editor
        height="100%"
        language={'json'}
        handleSave={handleSave}
        defaultValue={defaultValue}
        options={{
          readOnly: readOnly,
        }}
        onValidate={onValidate}
        onChange={(newValue) => {
          setValue(newValue);
          onSchemaChange(newValue);
        }}
        onMount={handleEditorDidMount}
      />

      {functionBody ? <div
        className={classes.actions}
        style={
          cursorPosition && {
            top: cursorPosition.top + (Editor ? -40 : 0),
            left: cursorPosition.left,
          }
        }
      >
        {language === 'javascript' ? (
          <IconButton
            size="large"
            className={classes.button}
            onClick={() => {
              saveEditorScrollTop();
              setFunctionEditorData({ functionRow, functionName, functionBody, language });
            }}
          >
            <CodeIcon />
          </IconButton>
        ) : null}
        {language === 'html' ? (
          <HtmlEditor
            value={functionBody}
            handleSave={newFunctionBody => {
              onFunctionChange({
                functionRow,
                functionName,
                functionBody: newFunctionBody
              });
            }}
          />
        ) : null}
      </div> : null}
    </div>
  );
};

export default MonacoEditor;
