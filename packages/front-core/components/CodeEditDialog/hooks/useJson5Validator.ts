import JSON5 from 'json5';
import { useEffect } from 'react';

interface AceEditorInstance {
  editor?: {
    getSession: () => {
      getMode: () => { $id: string };
      doc: { getValue: () => string };
      setAnnotations: (markers: unknown[]) => void;
    };
  };
}

interface Json5ParseError extends Error {
  lineNumber: number;
  columnNumber: number;
}

// This hook was written for the Ace editor and never updated for the
// Monaco editor instance it's actually passed (`editorInstance?.editor`
// doesn't exist on a Monaco instance) — `editorSession` is always
// undefined, so this early-returns and never actually validates anything.
// Confirmed dead-but-harmless via the real caller (CodeEditDialog/CodeEditor.jsx)
// passing a Monaco editor instance; preserved as-is.
export default (editorInstance: AceEditorInstance | null | undefined, values: unknown[] = []) =>
  useEffect(() => {
    const editorSession = editorInstance?.editor?.getSession();
    if (!editorSession || editorSession.getMode().$id !== 'ace/mode/json5') return;

    try {
      JSON5.parse(editorSession.doc.getValue());
      editorSession.setAnnotations([]);
    } catch (e) {
      const { lineNumber, columnNumber, message } = e as Json5ParseError;
      editorSession.setAnnotations([
        {
          row: lineNumber - 1,
          column: columnNumber - 1,
          text: message,
          type: 'error' //This would give a red x on the gutter
        }
      ]);
    }
  }, [editorInstance, ...values]);
