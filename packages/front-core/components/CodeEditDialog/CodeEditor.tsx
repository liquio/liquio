import React from 'react';
import { translate } from 'react-translate';
import { IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import CodeIcon from '@mui/icons-material/Code';
import SplitPaneRaw from 'react-split-pane';

import EditorRaw from 'components/Editor';
import FunctionEditorRaw from 'components/CodeEditDialog/FunctionEditor';
import useSelectionMonacoEditor from 'components/CodeEditDialog/hooks/useSelectionMonacoEditor';
import useJson5Validator from 'components/CodeEditDialog/hooks/useJson5Validator';

import { useUserSettings } from 'components/UserSettings/useUserSettings';

// Same real react-split-pane version/types mismatch already documented in
// layouts/components/DebugTools/tools/EDSFormTest.tsx and CustomInterfaceCheck.tsx.
const SplitPane = SplitPaneRaw as unknown as React.ComponentType<Record<string, unknown>>;

// `Editor`/`FunctionEditor` are cast lazily inside the component below,
// rather than here at module scope: both are part of the same
// Editor <-> UserSettings <-> JsonSchema circular import chain documented
// in TYPESCRIPT.md (the `formElements`/`CodeEditDialogUntyped` crashes) —
// a module-top-level read of either can run while that module is still
// mid-evaluation. The original untyped `.jsx` only ever referenced them
// from inside JSX (i.e. deferred to render time), which is what actually
// kept it safe; casting at module scope here would silently reintroduce
// the same class of crash.

export const defaultHtml = (defaultHtmlValue?: boolean) =>
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

type AppTheme = Theme & { header?: { background?: string } };

const styles = (theme: AppTheme) => ({
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
    position: 'fixed' as const,
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
    position: 'absolute' as const,
    color: '#ffffff'
  },
  editorContainer: {
    width: '100%',
    height: '100%',
    position: 'relative' as const
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

interface MonacoEditorProps {
  classes: Record<string, string>;
  open?: boolean;
  onClose?: () => void;
  onChange?: (value: string | undefined) => void;
  onValidate?: (errors: unknown[]) => void;
  value?: string;
  description?: string;
  mode?: string;
  schema?: unknown;
  handleSave?: (value: string) => void;
  handleSaveButton?: () => React.ReactNode;
  readOnly?: boolean;
  defaultHtmlValue?: boolean;
}

const MonacoEditor = ({
  mode = 'json5',
  classes,
  value = '',
  onChange = () => null,
  handleSave = () => null,
  readOnly = false,
  defaultHtmlValue = true,
  onValidate = () => null
}: MonacoEditorProps) => {
  const Editor = EditorRaw as unknown as React.ComponentType<Record<string, unknown>>;
  const FunctionEditor = FunctionEditorRaw as unknown as React.ComponentType<Record<string, unknown>>;
  const [functionEditorData, setFunctionEditorData] = React.useState<{
    functionRow?: number;
    functionName?: string;
    functionBody?: string;
    language?: string;
  } | null>(null);
  const [editorInstance, setEditorInstance] = React.useState<unknown>(null);
  const isMountedRef = React.useRef(false);
  const { settings } = useUserSettings('editor') as unknown as { settings: { options?: Record<string, unknown> & { theme?: string } } };

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useJson5Validator(editorInstance as never);

  const updateSelectedData = (editor: { getPosition: () => { column: number; lineNumber: number } }) => {
    const position = editor.getPosition();

    setSelection({
      anchor: { column: position.column, row: position.lineNumber }
    });
  };

  const handleEditorDidMount = (editor: {
    onDidChangeCursorPosition: (cb: () => void) => { dispose: () => void };
  }) => {
    setEditorInstance(editor);
    const cursorListener = editor.onDidChangeCursorPosition(() => updateSelectedData(editor as never));

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
  } = useSelectionMonacoEditor(editorInstance as never);

  const setDefaultValue = (value: string, mode?: string) => {
    if (!isMountedRef.current && mode === 'html' && !value.length) {
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
              setFunctionEditorData(null);
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
          style={cursorPosition ? { top: cursorPosition.top + (Editor ? -40 : 0), left: cursorPosition.left } : undefined}
          size="large"
        >
          <CodeIcon />
        </IconButton>
      ) : null}
    </>
  );
};

const styled = withStyles(styles)(MonacoEditor as never);

export default translate('Elements')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
