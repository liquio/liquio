import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMonaco, Monaco } from '@monaco-editor/react';
import { makeStyles } from '@mui/styles';

// Imported from the concrete file rather than the `components/UserSettings`
// barrel — see the identical fix (and full explanation) in
// components/Editor/hooks/useOptions.tsx.
import { useUserSettings } from 'components/UserSettings/useUserSettings';
import { useControlDictionary } from './useControlDictionary';
import { getAttributeKeyPositions, AttributeKeyPosition } from '../helpers/getAttributeKeyPositions';

type HoverProviderType = Parameters<Monaco['languages']['registerHoverProvider']>[1];
type HoverModel = Parameters<HoverProviderType['provideHover']>[0];
type HoverPosition = Parameters<HoverProviderType['provideHover']>[1];

const useStyles = makeStyles({
  highlight: {
    borderBottom: '1px dashed #9cdcfe90'
  }
});

interface EditorInstance {
  deltaDecorations: (oldDecorations: string[], newDecorations: unknown[]) => string[];
}

export const useControlDictionaryProvider = (value = '') => {
  const monaco = useMonaco();
  const classes = useStyles();

  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const updateDelay = 500; // Delay in milliseconds

  const { settings } = useUserSettings('editor', { controlHintsEnabled: true }) as unknown as { settings: { controlHintsEnabled: boolean } };
  const [editorInstance, setEditorInstance] = useState<EditorInstance | null>(null);
  const [attributeKeyPositions, setAttributeKeyPositions] = useState<AttributeKeyPosition[]>([]);
  const { list: controlKeyMap, getControlContents } = useControlDictionary();

  const computeMatches = useCallback(() => {
    if (!settings.controlHintsEnabled) {
      setAttributeKeyPositions([]);
      return;
    }
    const matches = getAttributeKeyPositions(controlKeyMap as never, value || '');
    setAttributeKeyPositions(matches);
  }, [value, controlKeyMap, settings.controlHintsEnabled]);

  // Setup hover provider
  useEffect(() => {
    if (!monaco) return;

    const hoverProvider = monaco.languages.registerHoverProvider('json', {
      provideHover: function (model: HoverModel, position: HoverPosition) {
        for (const match of attributeKeyPositions) {
          const { line, start, length } = match;
          if (
            position.lineNumber === line &&
            position.column >= start &&
            position.column <= start + length
          ) {
            return getControlContents(match.control as unknown as string, match.key).then((contents: unknown) => ({
              range: new monaco.Range(line, start + 1, line, start + length - 2),
              contents
            }));
          }
        }
        return null;
      }
    });

    return () => {
      hoverProvider.dispose();
    };
  }, [monaco, attributeKeyPositions, getControlContents]);

  // hightlight the selected key
  useEffect(() => {
    if (!monaco || !editorInstance) return;

    const decorations = attributeKeyPositions.map((match) => ({
      range: new monaco.Range(
        match.line,
        match.start + 1,
        match.line,
        match.start + match.length - 2
      ),
      options: {
        isWholeLine: false,
        inlineClassName: classes.highlight,
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    }));

    const decorationIds = editorInstance.deltaDecorations([], decorations);

    return () => {
      if (editorInstance) {
        editorInstance.deltaDecorations(decorationIds, []);
      }
    };
  }, [monaco, editorInstance, attributeKeyPositions, classes.highlight]);

  // Setup editor scroll listener
  useEffect(() => {
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }

    updateTimerRef.current = setTimeout(() => {
      computeMatches();
    }, updateDelay);
  }, [value]);

  const attachEditorInstance = useCallback((editor: EditorInstance) => {
    setEditorInstance(editor);
  }, []);

  return {
    setEditorInstance: attachEditorInstance
  };
};
