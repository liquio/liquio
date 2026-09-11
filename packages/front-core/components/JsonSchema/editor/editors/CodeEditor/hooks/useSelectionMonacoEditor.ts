import React from 'react';
import type { OnMount } from '@monaco-editor/react';

type EditorInstance = Parameters<OnMount>[0];

const regex = /"(.+)": +"(.+)"/;
const functionRegexList: Record<string, RegExp[]> = {
  javascript: [
    /\((.+)?\)(.+)?=>.+/,
    /function\s*\w*\s*\(.*\)\s*{.*}/,
    /function\s*\w*\s*=>\s*{.*}/,
  ],
  html: [
    /<\/?[a-z][\s\S]*>/i,
    /<\w+.*?>.*?<\/\w+>/,
    /<\s*(\w+)(?:\s+[^>]*)?>\s*<\s*\w+(?:\s+[^>]*)?>((?:.|\n)*?{{[^}]+}}(?:.|\n)*?)<\/\s*\w+>\s*<\/\s*\1>/,
  ],
};

interface Selection {
  anchor: { column: number; row: number };
}

interface FunctionChange {
  functionRow: number;
  functionName: string;
  functionBody: string;
}

const useSelectionMonacoEditor = (
  editorInstance: EditorInstance | null,
) => {
  const [row, setRow] = React.useState<number>();
  const [column, setColumn] = React.useState<number>();
  const [language, setLanguage] = React.useState<string>();
  const [functionBody, setFunctionBody] = React.useState<string>();
  const [functionName, setFunctionName] = React.useState<string>();
  const [cursorPosition, setCursorPosition] = React.useState<{ top: number; left: number }>();
  const [editorScrollTop, setEditorScrollTop] = React.useState<number>();

  React.useEffect(() => {
    if (editorInstance && editorScrollTop) {
      editorInstance.setScrollTop(editorScrollTop);
      setEditorScrollTop(undefined);
    }
  }, [editorInstance, editorScrollTop]);

  React.useEffect(() => {
    if (column === undefined || row === undefined || !editorInstance) return;
    const model = editorInstance.getModel();
    if (!model || row < 1 || row > model.getLineCount()) return;
    const line = model.getLineContent(row);

    try {
      const match = line.match(regex);
      if (!match) throw new Error();
      const [, matchedName, matchedBody] = match;
      const matchedLanguage = Object.keys(functionRegexList).find((name) =>
        functionRegexList[name].some((pattern) => pattern.test(matchedBody)),
      );
      if (!matchedLanguage) throw new Error();
      const position = editorInstance.getPosition();
      const visiblePosition = position
        ? editorInstance.getScrolledVisiblePosition(position)
        : null;
      if (!visiblePosition) throw new Error();
      setCursorPosition({ top: visiblePosition.top, left: visiblePosition.left });
      setLanguage(matchedLanguage);
      setFunctionBody(matchedBody);
      setFunctionName(matchedName);
    } catch {
      setLanguage(undefined);
      setFunctionBody(undefined);
      setFunctionName(undefined);
    }
  }, [column, editorInstance, row]);

  const saveEditorScrollTop = React.useCallback(() => {
    setEditorScrollTop(editorInstance?.getScrollTop());
  }, [editorInstance]);

  const onFunctionChange = React.useCallback(
    ({ functionRow, functionName: changedName, functionBody: changedBody }: FunctionChange) => {
      try {
        const model = editorInstance?.getModel();
        if (!model) throw new Error();
        if (functionRow < 1 || functionRow > model.getLineCount()) return;
        const line = model.getLineContent(functionRow);
        const match = line.match(regex);
        if (!match) throw new Error();
        const [, matchedName, matchedBody] = match;
        const matchedLanguage = Object.keys(functionRegexList).find((name) =>
          functionRegexList[name].some((pattern) => pattern.test(matchedBody)),
        );
        if (!matchedLanguage || matchedName !== changedName) {
          throw new Error(`There is no key "${changedName}", which function has been edited in functionEditor.`);
        }
        model.pushEditOperations([], [{
          range: {
            startLineNumber: functionRow,
            startColumn: 1,
            endLineNumber: functionRow,
            endColumn: model.getLineMaxColumn(functionRow),
          },
          text: line.replace(matchedBody, changedBody.replace(/"/g, '\\"')),
        }], () => null);
      } catch (error) {
        console.log(error);
      }
    },
    [editorInstance],
  );

  return {
    language,
    functionName,
    cursorPosition,
    functionRow: row,
    onFunctionChange,
    saveEditorScrollTop,
    functionBody: functionBody?.replace(/\\"/g, '"'),
    setSelection: (selection: Selection) =>
      setTimeout(() => {
        setColumn(selection.anchor.column);
        setRow(selection.anchor.row);
      }, 50),
  };
};

export default useSelectionMonacoEditor;
