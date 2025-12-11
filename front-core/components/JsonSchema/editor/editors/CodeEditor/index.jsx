import { useCallback, useEffect, useState } from 'react';
import Editor from 'components/Editor';

import CodeIcon from '@mui/icons-material/Code';
import IconButton from '@mui/material/IconButton';

import FunctionEditor from 'components/CodeEditDialog/FunctionEditor';

import BpmnAi from 'components/BpmnAi';
import { generateTechSpecBySchema } from 'application/actions/bpmnAi';
import { useControlDictionaryProvider } from 'components/Editor/hooks/useControlDictionaryProvider';
import useSelectionMonacoEditor from './hooks/useSelectionMonacoEditor';
// import { onInsertJSONCodeFunction } from '../../helpers/onInsertJSONCodeFunction';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import { makeStyles } from '@mui/styles';

import { UserSettingsButton } from 'components/UserSettings';
import editorSettingsSchema from 'components/Editor/variables/editorSettingsSchema.json';
import SettingsIcon from '@mui/icons-material/Settings';

import classNames from 'classnames';

const useStyles = makeStyles({
  codeButton: {
    position: 'absolute',
    color: '#ffffff',
  },
  mainPanel: {
    flex: 1,
    position: 'relative',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)'
  },
  overflowHidden: {
    overflow: 'hidden',
  },
});

export const CodeEditor = ({
  value = '',
  onChange = () => { },
  onValidate = () => { },
  handleSave = () => { },
}) => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const [bpmnAiOpen, setBpmnAiOpen] = useState(false);
  const [updateLayout, setUpdateLayout] = useState(false);
  const [monacoInstance, setMonacoInstance] = useState(null);
  const [editorInstance, setEditorInstance] = useState(null);
  const [functionEditorData, setFunctionEditorData] = useState(null);

  useEffect(() => {
    setUpdateLayout(true);
    const timer = setTimeout(() => {
      setUpdateLayout(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [functionEditorData, bpmnAiOpen]);

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

  const controls = useControlDictionaryProvider(value);

  const handleEditorDidMount = useCallback((editor) => {
    setEditorInstance(editor);
    setMonacoInstance(monaco);

    const scrollListener = controls.setEditorInstance(editor);
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
            }).catch((error) => {
              dispatch(addMessage(new Message(error.message, 'error')));
            }
            );
        },
      });
    }

    return () => {
      scrollListener.dispose();
      cursorListener.dispose();
    };
  }, [setEditorInstance]);

  const insertJSONCode = useCallback((jsonCode) => {
    if (!editorInstance || !monacoInstance) return;

    const position = editorInstance.getPosition();
    const lineContent = editorInstance.getModel().getLineContent(position.lineNumber);

    let newLineContent = lineContent;
    let insertRange;
    let insertText;

    if (lineContent.trim() === '{}') {
      insertRange = new monacoInstance.Range(
        position.lineNumber,
        lineContent.indexOf('{') + 2,
        position.lineNumber,
        lineContent.indexOf('}') + 1,
      );
      insertText = jsonCode;
    } else {
      if (lineContent.trim().endsWith(',')) {
        newLineContent = lineContent.trim().slice(0, -1);
      }

      const range = new monacoInstance.Range(
        position.lineNumber,
        1,
        position.lineNumber,
        lineContent.length + 1,
      );

      editorInstance.executeEdits('', [
        { range, text: newLineContent, forceMoveMarkers: true },
      ]);

      insertRange = new monacoInstance.Range(
        position.lineNumber,
        newLineContent.length + 1,
        position.lineNumber,
        newLineContent.length + 1,
      );

      insertText =
        lineContent.trim() === ''
          ? jsonCode
          : lineContent.trim().endsWith(',')
            ? jsonCode
            : `,${jsonCode}`;
    }

    editorInstance.executeEdits('', [
      { range: insertRange, text: insertText, forceMoveMarkers: true },
    ]);
    editorInstance.getAction('editor.action.formatDocument').run();

    const endPosition = editorInstance
      .getModel()
      .getPositionAt(
        editorInstance.getModel().getOffsetAt(insertRange.getStartPosition()) +
        insertText.length,
      );
    const newPosition = new monacoInstance.Position(
      endPosition.lineNumber - 1,
      endPosition.column,
    );
    editorInstance.setPosition(newPosition);
  }, [editorInstance, monacoInstance]);

  return (
    <>
      <div className={classNames({
        [classes.mainPanel]: true,
        [classes.overflowHidden]: updateLayout,
      })}
      >
        <Editor
          width="none"
          value={value}
          language={'json'}
          onChange={onChange}
          handleSave={handleSave}
          onValidate={onValidate}
          onMount={handleEditorDidMount}
          automaticLayout={true}
        />
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
                left: cursorPosition.left,
              }
            }
            size="large"
          >
            <CodeIcon />
          </IconButton>
        ) : null}
      </div>
      {functionEditorData ? (
        <div className={classes.mainPanel}>
          <FunctionEditor
            {...functionEditorData}
            // readOnly={readOnly}
            onChange={onFunctionChange}
            onClose={() => {
              saveEditorScrollTop();
              setFunctionEditorData();
            }}
          />
        </div>
      ) : (
        <BpmnAi
          open={bpmnAiOpen}
          fromCodeEditor={true}
          onInsertJSONCode={insertJSONCode}
          onToggleSplit={() => setBpmnAiOpen(!bpmnAiOpen)}
        />
      )}
    </>
  );
}

CodeEditor.Settings = () => {
  const t = useTranslate('JsonSchemaEditor');
  return (
    <UserSettingsButton
      part="editor"
      title={t('EditorSettings')}
      icon={<SettingsIcon />}
      schema={editorSettingsSchema || {}}
      defaults={{
        controlHintsEnabled: true,
        copilot: {
          enabled: true,
          model: 'liquio-copilot',
        }
      }}
    />
  );
}
