import JSON5 from 'json5';
import { useEffect } from 'react';

export default (editorInstance, values = []) =>
  useEffect(() => {
    const editorSession = editorInstance?.editor?.getSession();
    if (!editorSession || editorSession.getMode().$id !== 'ace/mode/json5') return;

    try {
      JSON5.parse(editorSession.doc.getValue());
      editorSession.setAnnotations([]);
    } catch (e) {
      const { lineNumber, columnNumber, message } = e;
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
