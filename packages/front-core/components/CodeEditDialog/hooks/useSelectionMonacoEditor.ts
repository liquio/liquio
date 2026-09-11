import React from 'react';
import type { OnMount, Monaco } from '@monaco-editor/react';

// `monaco-editor`'s package.json "exports" map isn't resolved under this
// project's moduleResolution setting when imported directly (see
// components/Editor/Editor.tsx), so the editor instance type is derived
// from @monaco-editor/react's own OnMount export instead.
type MonacoEditorInstance = Parameters<OnMount>[0];

// This file references a bare `monaco` global that is never imported here —
// the same real pre-existing bug documented in components/Editor/DragProvider.tsx
// (no import, no global declaration, no bundler ProvidePlugin anywhere).
// `onFunctionChange` (below) is reachable whenever a user edits a detected
// inline function via FunctionEditor and saves — that path throws
// `ReferenceError: monaco is not defined`. Preserved exactly per this
// migration's rule against silently fixing pre-existing behavior.
declare const monaco: Monaco;

const regex = /"(.+)": +"(.+)"/;

const functionRegexList: Record<string, RegExp[]> = {
  javascript: [
    /\((.+)?\)(.+)?=>.+/,
    /function\s*\w*\s*\(.*\)\s*{.*}/,
    /function\s*\w*\s*=>\s*{.*}/
  ],
  html: [
    /<\/?[a-z][\s\S]*>/i,
    /<\w+.*?>.*?<\/\w+>/,
    /<\s*(\w+)(?:\s+[^>]*)?>\s*<\s*\w+(?:\s+[^>]*)?>((?:.|\n)*?{{[^}]+}}(?:.|\n)*?)<\/\s*\w+>\s*<\/\s*\1>/
  ]
};

interface Selection {
  anchor: { column: number; row: number };
}

interface OnFunctionChangeArgs {
  functionRow: number;
  functionName?: string;
  functionBody: string;
}

// `aceRef` is a legacy name from before the Ace->Monaco migration: it's
// actually the real Monaco editor instance. `aceRef.editor.renderer.scrollTop`
// (below) is Ace-only API that doesn't exist on a Monaco instance — this
// silently no-ops (scroll-position preservation across FunctionEditor
// open/close never actually works), while the rest of this hook
// (getModel/getScrolledVisiblePosition/getPosition) uses real Monaco APIs
// and does work. Preserved as-is rather than "fixing" the dead branch.
const useSelectionMonacoEditor = (aceRef: MonacoEditorInstance & { editor?: { renderer: { scrollTop: number } } }) => {
  const [row, setRow] = React.useState<number>();
  const [column, setColumn] = React.useState<number>();
  const [language, setLanguage] = React.useState<string>();
  const [functionBody, setFunctionBody] = React.useState<string>();
  const [functionName, setFunctionName] = React.useState<string>();
  const [cursorPosition, setCursorPosition] = React.useState<{ top: number; left: number }>();
  const [editorScrollTop, setEditorScrollTop] = React.useState<number>();

  React.useEffect(() => {
    if (!aceRef?.editor) {
      return;
    }

    if (editorScrollTop) {
      aceRef.editor.renderer.scrollTop = editorScrollTop;
      setEditorScrollTop(undefined);
    }
  }, [aceRef]);

  React.useEffect(() => {
    if (!column || !row || !aceRef?.getModel()) {
      return;
    }

    const model = aceRef.getModel()!;
    if (row < 1 || row > model.getLineCount()) {
      return;
    }

    const line = model.getLineContent(row);

    try {
      if (!regex.test(line)) {
        throw new Error();
      }

      const [, funcName, func] = line.match(regex) as unknown as [string, string, string];

      const lang = Object.keys(functionRegexList).find((lang) =>
        functionRegexList[lang].some((regex) => regex.test(func))
      );

      if (!lang) {
        throw new Error();
      }

      const { top, left } = (aceRef as unknown as {
        getScrolledVisiblePosition: (pos: unknown) => { top: number; left: number };
        getPosition: () => unknown;
      }).getScrolledVisiblePosition(
        (aceRef as unknown as { getPosition: () => unknown }).getPosition(),
      );

      setCursorPosition({ top, left });
      setLanguage(lang);
      setFunctionBody(func);
      setFunctionName(funcName);
    } catch (e) {
      setLanguage(undefined);
      setFunctionBody(undefined);
      setFunctionName(undefined);
    }
  }, [column, row, aceRef]);

  const saveEditorScrollTop = React.useCallback(() => {
    setEditorScrollTop(aceRef.editor?.renderer.scrollTop);
  }, [aceRef]);

  const onFunctionChange = React.useCallback(
    ({ functionRow, functionName, functionBody: changedFunctionBody }: OnFunctionChangeArgs) => {
      try {
        const model = aceRef.getModel();

        if (!model) {
          throw new Error();
        }

        if (functionRow < 1 || functionRow > model.getLineCount()) {
          return;
        }

        const line = model.getLineContent(functionRow);

        const [, funcName, func] = line.match(regex) as unknown as [string, string, string];

        const lang = Object.keys(functionRegexList).find((lang) =>
          functionRegexList[lang].some((regex) => regex.test(func))
        );

        if (!lang || funcName !== functionName) {
          throw new Error(
            `There is no key "${functionName}", which function has been edited in functionEditor.`
          );
        }

        const edit = {
          range: new monaco.Range(functionRow, 1, functionRow, model.getLineMaxColumn(functionRow)),
          text: line.replace(func, changedFunctionBody.replace(/"/g, '\\"'))
        };

        (model as unknown as { pushEditOperations: (a: unknown[], b: unknown[], c: () => null) => void }).pushEditOperations([], [edit], () => null);
      } catch (e) {
        console.log(e);
      }
    },
    [aceRef]
  );

  return {
    language,
    functionName,
    cursorPosition,
    functionRow: row,
    onFunctionChange,
    saveEditorScrollTop,
    functionBody: functionBody && functionBody.replace(/\\"/g, '"'),
    setSelection: (selection: Selection) =>
      setTimeout(() => {
        const {
          anchor: { column: c, row: r }
        } = selection;
        setColumn(c);
        setRow(r);
      }, 50)
  };
};

export default useSelectionMonacoEditor;
