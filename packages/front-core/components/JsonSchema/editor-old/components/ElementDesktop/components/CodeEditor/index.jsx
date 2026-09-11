import React from 'react';
import { useDrop } from 'react-dnd';
import { useTranslate } from 'react-translate';
import objectPath from 'object-path';
import { makeStyles } from '@mui/styles';
import SplitPane from 'react-split-pane';
import { withEditor } from 'components/JsonSchema/editor/JsonSchemaProvider';
import ElementIdDialog from 'components/JsonSchema/editor/components/ElementDesktop/components/VisualEditor/components/ElementIdDialog';
import SnippetList from 'components/JsonSchema/editor/components/ElementDesktop/components/CodeEditor/components/SnippetList';
import FunctionEditor from 'components/JsonSchema/editor/components/ElementDesktop/components/CodeEditor/components/FunctionEditor';
import BpmnAi from './components/BpmnAi';
import useSelectionMonacoEditor from 'components/JsonSchema/editor/components/ElementDesktop/components/CodeEditor/hooks/useSelectionMonacoEditor';
import useTranslation from 'components/JsonSchema/editor/components/ElementDesktop/components/CodeEditor/hooks/useTranslate';
import highlightReadonlyFields from 'components/CodeEditDialog/helpers/highlightReadonlyFields';
import useJson5Validator from 'components/CodeEditDialog/hooks/useJson5Validator';
import MonacoEditor from 'components/JsonSchema/editor/components/ElementDesktop/components/CodeEditor/editor';
import { useJavascriptValidator } from './hooks/useJavascriptValidator';

const useStyles = makeStyles(() => ({
  root: {
    height: '100%',
    display: 'flex',
  },
  wrapper: {
    flex: 1,
    display: 'flex',
    height: '100%',
    position: 'relative',
  },
  editorContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  button: {
    position: 'absolute',
    color: '#ffffff',
  },
}));

const defaultSchema = (t) => ({
  title: t('taskTitle'),
  pdfRequired: false,
  signRequired: false,
  checkActive: '(documentData) => { return true; }',
  finalScreen: {
    title: t('finalScreenTitle'),
    subtitle: t('finalScreenSubtitle'),
  },
  calcTriggers: [],
  properties: {},
});

const CodeEditor = ({
  newValue,
  onSchemaChange,
  readOnly,
  onInsertJSONCode,
  handleSave,
  onValidate,
}) => {
  const t = useTranslate('Elements');
  const classes = useStyles();

  const initValue = newValue || JSON.stringify(defaultSchema(t), null, 4);

  const [folds, setFolds] = React.useState(null);
  const [value, setValue] = React.useState(initValue);
  const [functionEditorData, setFunctionEditorData] = React.useState();
  const [newElement, setNewElement] = React.useState(null);
  const [isSplit, setIsSplit] = React.useState(false);
  const [editorInstance, setEditorInstance] = React.useState(null);

  const { Suggester: TranslationSuggester } = useTranslation({
    editorInstance,
    onSchemaChange,
    value,
    folds,
  });

  React.useEffect(() => {
    if (!value) return;
    highlightReadonlyFields(t, editorInstance);
  }, [value, t]);

  useJavascriptValidator(editorInstance);

  const updateState = async (controlName) => {
    try {
      if (!editorInstance) return;
      const editor = editorInstance;
      const position = editor.getCursorPosition();

      const insertCode = () => {
        const isFunction = newElement.type === 'function';

        const getCode = () => {
          const parsedCode = JSON.parse(newElement.defaultData.data).code;
          if (isFunction) {
            return parsedCode;
          }
          return JSON.parse(parsedCode);
        };
        const code = getCode();

        if (!code) return;

        const stringifiedCode = JSON.stringify(code, null, 4);

        const replacedNewLine = stringifiedCode
          .replace(/\\n/g, '')
          .replace(/ {4}/g, ' ');

        let insertData = `"${controlName}": ${replacedNewLine}`;

        const prevSymbol = editor.session.getLine(position.row)[
          position.column - 1
        ];

        const nextSymbol = editor.session.getLine(position.row)[
          position.column
        ];

        if (prevSymbol === '}') insertData = ',' + insertData;
        if (nextSymbol === '"') insertData = insertData + ',';
        if (prevSymbol === ',') insertData = insertData + ',';
        if (nextSymbol === undefined) insertData = insertData + ',';

        editor.session.insert(position, insertData.replace(/,,/g, ','));
      };

      const insertTriggers = () => {
        const json = JSON.parse(JSON.parse(newElement.defaultData.data).json);

        if (!json) return;

        const schemaValue = JSON.parse(editor.session.getValue());
        const triggers = (schemaValue.calcTriggers || []).concat(json);

        schemaValue.calcTriggers = triggers;

        editor.session.setValue(JSON.stringify(schemaValue, null, 4));
      };

      const insertAddition = () => {
        const innerJson = JSON.parse(
          JSON.parse(newElement.defaultData.data).innerJson,
        );

        if (!innerJson) return;

        const schemaValue = JSON.parse(editor.session.getValue());

        Object.keys(innerJson).forEach((key) => {
          const prevValue = objectPath.get(schemaValue, key);
          const newValue = innerJson[key];

          if (prevValue) {
            if (Array.isArray(prevValue)) {
              objectPath.set(schemaValue, key, prevValue.concat(newValue));
            } else if (typeof prevValue === 'object') {
              objectPath.set(schemaValue, key, {
                ...prevValue,
                ...newValue,
              });
            }
          }
        });

        editor.getModel().setValue(JSON.stringify(schemaValue, null, 4));
      };

      insertCode();

      insertTriggers();

      insertAddition();

      const droppedState = editor.getModel().getValue();

      try {
        const parsed = JSON.parse(droppedState);
        editor.getModel().setValue(JSON.stringify(parsed, null, 4));
        onSchemaChange(parsed);
      } catch (e) {
        console.log('parse error', e);
      }
    } catch (e) {
      console.log('parse error', e);
    }
  };

  const handleInsertJsonAtCursor = (json) => {
    if (!editorInstance) return;
    const editor = editorInstance;
    const position = editor.getCursorPosition();

    const jsonString = JSON.stringify(json, null, 4);

    editor.session.insert(position, jsonString);
    setValue(editor.getValue());
    onSchemaChange(editor.getValue());
  };

  React.useEffect(() => {
    if (onInsertJSONCode) {
      onInsertJSONCode(handleInsertJsonAtCursor);
    }
  }, [onInsertJSONCode]);

  const [, drop] = useDrop({
    accept: ['function', 'control', 'container'],
    drop(item, monitor) {
      const didDrop = monitor.didDrop();
      if (
        didDrop 
        || !monitor.isOver({ shallow: true })
        || !editorInstance
      ) return;

      const editor = editorInstance;
      setFolds(Array.from(editor.session.$foldData) || []);
      setNewElement(item);
    },
  });

  const handleToggleSplit = () => {
    setIsSplit((prev) => !prev);
  };

  useJson5Validator(editorInstance, [value]);

  const onEditorFocus = () => {
    if (!editorInstance) return;
    
    editorInstance.focus();
    // set cursor position to the end of current line
    const position = editorInstance.getPosition();
    const lineContent = editorInstance.getModel().getLineContent(
      position.lineNumber,
    );
    const column = lineContent.length + 1;
    editorInstance.setPosition({
      lineNumber: position.lineNumber,
      column,
    });
    editorInstance.revealLineInCenter(position.lineNumber);
  }

  const onInsertJSONCodeFunction = (jsonCode) => {
    if (!editorInstance) return;
    const editor = editorInstance;
    if (editor) {
      const position = editor.getPosition();
      const lineContent = editor.getModel().getLineContent(position.lineNumber);
      let newLineContent = lineContent;
      let insertRange;
      let insertText;

      if (lineContent.trim() === '{}') {
        insertRange = new monaco.Range(
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

        const range = new monaco.Range(
          position.lineNumber,
          1,
          position.lineNumber,
          lineContent.length + 1,
        );
        editor.executeEdits('', [
          { range, text: newLineContent, forceMoveMarkers: true },
        ]);

        insertRange = new monaco.Range(
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

      editor.executeEdits('', [
        { range: insertRange, text: insertText, forceMoveMarkers: true },
      ]);
      editor.getAction('editor.action.formatDocument').run();

      // Calculate the new position after the inserted text
      const endPosition = editor
        .getModel()
        .getPositionAt(
          editor.getModel().getOffsetAt(insertRange.getStartPosition()) +
            insertText.length,
        );
      const newPosition = new monaco.Position(
        endPosition.lineNumber - 1,
        endPosition.column,
      );
      editor.setPosition(newPosition);
    }
  };

  const { onFunctionChange, saveEditorScrollTop } =
    useSelectionMonacoEditor(editorInstance);

  return (
    <div className={classes.root}>
      <SnippetList/>
      <TranslationSuggester />

      <div className={classes.wrapper} ref={drop}>
        <SplitPane
          minSize={
            isSplit || Object.keys(functionEditorData || {}).length > 0
              ? '60%'
              : '100%'
          }
          allowResize={
            isSplit || Object.keys(functionEditorData || {}).length > 0
          }
        >
          <MonacoEditor
            value={value}
            setValue={setValue}
            onMount={setEditorInstance}
            editorInstance={editorInstance}
            onSchemaChange={onSchemaChange}
            setFunctionEditorData={setFunctionEditorData}
            handleSave={handleSave}
            onValidate={onValidate}
          />
          {isSplit && !functionEditorData && (
            <BpmnAi
              open={isSplit}
              fromCodeEditor={true}
              onInsertJSONCode={onInsertJSONCodeFunction}
              onToggleSplit={handleToggleSplit}
              onEditorFocus={onEditorFocus}
            />
          )}
          {functionEditorData && (
            <FunctionEditor
              {...functionEditorData}
              readOnly={readOnly}
              schemaValue={value}
              classes={classes}
              onChange={onFunctionChange}
              onSchemaChange={onSchemaChange}
              onClose={() => {
                saveEditorScrollTop();
                setFunctionEditorData();
              }}
            />
          )}
        </SplitPane>
        <ElementIdDialog
          open={!!newElement}
          variant="outlined"
          readOnly={true}
          onClose={() => setNewElement(null)}
          onSave={(elementId) => {
            updateState(elementId);
            setNewElement(null);
          }}
        />
      </div>
      {!isSplit && !functionEditorData && (
        <BpmnAi
          open={isSplit}
          fromCodeEditor={true}
          onToggleSplit={handleToggleSplit}
        />
      )}
    </div>
  );
};

export default withEditor(CodeEditor);
