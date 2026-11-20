import { useCallback, useEffect, useState, type ComponentType } from 'react';
import type { Monaco, OnMount, OnValidate } from '@monaco-editor/react';
import Editor from 'components/Editor';

import CodeIcon from '@mui/icons-material/Code';
import IconButton from '@mui/material/IconButton';

import FunctionEditor from 'components/CodeEditDialog/FunctionEditor';

import BpmnAi from 'components/BpmnAi';
import { useControlDictionaryProvider } from 'components/Editor/hooks/useControlDictionaryProvider';
import useSelectionMonacoEditor from './hooks/useSelectionMonacoEditor';
// import { onInsertJSONCodeFunction } from '../../helpers/onInsertJSONCodeFunction';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import * as bpmnAiActions from 'application/actions/bpmnAi';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import saveAs from 'file-saver';
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

type EditorInstance = Parameters<OnMount>[0];

interface CodeEditorProps {
  value?: string;
  onChange?: (value?: string) => void;
  onValidate?: OnValidate;
  handleSave?: (value: string) => void | Promise<void>;
}

interface FunctionEditorData {
  functionRow: number;
  functionName: string;
  functionBody: string;
  language: string;
}

const generateTechSpecBySchema = (
  bpmnAiActions as unknown as Record<string, (body: unknown) => unknown>
).generateTechSpecBySchema;
const BpmnAiComponent = BpmnAi as unknown as ComponentType<Record<string, unknown>>;

export const CodeEditor = ({
  value = '',
  onChange = () => { },
  onValidate = () => { },
  handleSave = () => { },
}: CodeEditorProps) => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const [bpmnAiOpen, setBpmnAiOpen] = useState(false);
  const [updateLayout, setUpdateLayout] = useState(false);
  const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null);
  const [editorInstance, setEditorInstance] = useState<EditorInstance | null>(null);
  const [functionEditorData, setFunctionEditorData] = useState<FunctionEditorData | null>(null);

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

  const handleEditorDidMount: OnMount = useCallback((editor, mountedMonaco) => {
    setEditorInstance(editor);
    setMonacoInstance(mountedMonaco);

    controls.setEditorInstance(editor);
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
          await (dispatch(generateTechSpecBySchema({ jsonSchema: value }) as never) as unknown as Promise<unknown>)
            .then((response) => {
              const result = response as Blob & { message?: string };
              if (result.message) dispatch(addMessage(new Message(result.message, 'error')) as never);
              saveAs(result);
            }).catch((error: unknown) => {
              const message = error instanceof Error ? error.message : String(error);
              dispatch(addMessage(new Message(message, 'error')) as never);
            }
            );
        },
      });
    }

    return () => {
      cursorListener.dispose();
    };
  }, [setEditorInstance]);

  const insertJSONCode = useCallback((jsonCode: string) => {
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
              setFunctionEditorData({
                functionRow: functionRow ?? 0,
                functionName: functionName ?? '',
                functionBody,
                language: language ?? 'javascript',
              });
            }}
            style={
              cursorPosition && {
              top: cursorPosition.top - 40,
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
            readOnly={false}
            onChange={onFunctionChange as (args: { functionRow: number; functionName?: string; functionBody: string }) => void}
            onClose={() => {
              saveEditorScrollTop();
              setFunctionEditorData(null);
            }}
          />
        </div>
      ) : (
        <BpmnAiComponent
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
        controlHintsEnabled: true
      }}
    />
  );
}
