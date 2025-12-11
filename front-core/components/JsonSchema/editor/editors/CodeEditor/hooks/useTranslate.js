import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getLocalizationTexts } from 'actions/localization';
import ArrowNavigatingList from '../components/ArrowNavigatingList';
import { getConfig } from '../../../../../../helpers/configLoader';

const useTranslate = ({ editorInstance, onSchemaChange, folds }) => {
  const config = getConfig();
  const localizationTexts = useSelector((state) => state?.app?.localizationTexts || null);

  const [suggestionsList, setSuggestionsList] = React.useState([]);
  const [autoFocus, setAutoFocus] = React.useState(false);
  const [translates, setTranslates] = React.useState(localizationTexts || []);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const dispatch = useDispatch();

  React.useEffect(() => {
    const fetchTranslation = async () => {
      setLoading(true);
      const response = await dispatch(getLocalizationTexts());
      setTranslates(response);
      setLoading(false);
    };

    if (loading || localizationTexts) return;

    if (['development', 'stage'].includes(config?.application?.environment)) {
      fetchTranslation();
    }
  }, [loading, localizationTexts, dispatch]);

  const handleClose = React.useCallback(() => {
    if (!editorInstance) return;
    const { editor } = editorInstance;
    setSuggestionsList([]);
    setAutoFocus(false);
    editor.focus();
  }, [editorInstance]);

  const insertSuggestion = React.useCallback(
    (suggested = '') => {
      if (!editorInstance) return;
      const { editor } = editorInstance;

      const position = editor.getCursorPosition();

      const { row } = position;

      const getLine = editor.session.getLine(row);

      const replace = getLine.replace(search, suggested);

      const range = {
        start: { row, column: 0 },
        end: { row, column: getLine.length }
      };

      editor.session.replace(range, replace);

      setSuggestionsList([]);

      const droppedState = editor.session.getValue();

      try {
        const parsed = JSON.parse(droppedState);

        editor.session.setValue(JSON.stringify(parsed, null, 4));

        onSchemaChange(JSON.stringify(parsed, null, 4));

        if (folds) {
          folds.forEach(({ start }) => editor.session.$toggleFoldWidget(start.row, {}));
        }

        editor.moveCursorTo(position.row, position.column + suggested.length);

        editor.focus();

        setAutoFocus(false);
      } catch (e) {
        console.log('parse error', e);
      }
    },
    [editorInstance, onSchemaChange, folds, search]
  );

  const showTranslationHandler = React.useCallback(() => {
    try {
      if (!editorInstance) {
        return;
      }

      const { editor } = editorInstance;
      const selectedText = editor.session.getTextRange(editor.getSelectionRange());

      const existing = [];

      if (!translates.length) {
        return;
      }

      translates.forEach((item) => {
        if (item.value === selectedText) {
          existing.push(item);
        }
      });

      setSearch(selectedText);

      setSuggestionsList(existing.map(({ key }) => key));
    } catch (e) {
      console.log(e);
    }
  }, [editorInstance, translates]);

  const Suggester = React.useCallback(
    ({ headerHeight = 0 }) => {
      if (!suggestionsList.length || !editorInstance) return null;

      const { editor } = editorInstance;

      const { row, column } = editor.getCursorPosition();

      const { scrollTop } = editor.renderer;

      const { top, left } = editor.renderer.$cursorLayer.getPixelPosition({
        row,
        column
      });

      const leftSideBarWidth = 80;

      const styles = {
        top: top - scrollTop + 20 + headerHeight,
        left: left + leftSideBarWidth
      };

      return (
        <ArrowNavigatingList
          autoFocus={autoFocus}
          list={suggestionsList}
          handleSelect={insertSuggestion}
          handleClose={handleClose}
          position={styles}
        />
      );
    },
    [suggestionsList, autoFocus, editorInstance, insertSuggestion, handleClose]
  );

  return {
    showTranslationHandler,
    Suggester
  };
};

export default useTranslate;
