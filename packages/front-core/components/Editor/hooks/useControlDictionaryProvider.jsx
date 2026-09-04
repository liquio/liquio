import { useEffect, useState, useCallback, useRef } from 'react';
import { useMonaco } from '@monaco-editor/react';
import { makeStyles } from '@mui/styles';

import { useUserSettings } from 'components/UserSettings';
import { useControlDictionary } from './useControlDictionary';
import { getAttributeKeyPositions } from '../helpers/getAttributeKeyPositions';

const useStyles = makeStyles({
  highlight: {
    borderBottom: '1px dashed #9cdcfe90'
  }
});

export const useControlDictionaryProvider = (value = '') => {
  const monaco = useMonaco();
  const classes = useStyles();

  const updateTimerRef = useRef(null);
  const updateDelay = 500; // Delay in milliseconds

  const { settings } = useUserSettings('editor', { controlHintsEnabled: true });
  const [editorInstance, setEditorInstance] = useState(null);
  const [attributeKeyPositions, setAttributeKeyPositions] = useState([]);
  const { list: controlKeyMap, getControlContents } = useControlDictionary();

  const computeMatches = useCallback(() => {
    if (!settings.controlHintsEnabled) {
      setAttributeKeyPositions([]);
      return;
    }
    const matches = getAttributeKeyPositions(controlKeyMap, value || '');
    setAttributeKeyPositions(matches);
  }, [value, controlKeyMap, settings.controlHintsEnabled]);

  // Setup hover provider
  useEffect(() => {
    if (!monaco) return;

    const hoverProvider = monaco.languages.registerHoverProvider('json', {
      provideHover: function (model, position) {
        for (let match of attributeKeyPositions) {
          const { line, start, length } = match;
          if (
            position.lineNumber === line &&
            position.column >= start &&
            position.column <= start + length
          ) {
            return getControlContents(match.control, match.key).then((contents) => ({
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

  const attachEditorInstance = useCallback((editor) => {
    setEditorInstance(editor);
  }, []);

  return {
    setEditorInstance: attachEditorInstance
  };
};
