import { useMonaco } from '@monaco-editor/react';


export const onInsertJSONCodeFunction = (editorInstance) => (jsonCode) => {
  const monaco = useMonaco();

  if (!editorInstance || !monaco) return;
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
