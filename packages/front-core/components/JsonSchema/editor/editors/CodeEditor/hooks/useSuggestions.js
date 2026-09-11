import React from 'react';
import objectPath from 'object-path';
import findPath from 'helpers/findPath';
import ArrowNavigatingList from '../components/ArrowNavigatingList';

const useSelection = ({ aceRef, value, onSchemaChange, folds }) => {
  const [suggestionsList, setSuggestionsList] = React.useState([]);
  const [autoFocus, setAutoFocus] = React.useState(false);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (!aceRef?.current) return;
    const { editor } = aceRef.current;

    if (!editor) return;

    editor.commands.addCommand({
      name: 'Down',
      bindKey: { win: 'Down', mac: 'Down' },
      exec: () => {
        try {
          const { editor } = aceRef.current;

          const position = editor.getCursorPosition();

          if (suggestionsList.length) {
            setAutoFocus(true);
          } else {
            if (autoFocus) setAutoFocus(false);
            editor.moveCursorTo(position.row + 1, position.column);
          }
        } catch (e) {
          console.log(e);
        }
      },
    });
  });

  const handleClose = () => {
    const { editor } = aceRef.current;
    setSuggestionsList([]);
    setAutoFocus(false);
    editor.focus();
  };

  const insertSuggestion = (suggested = '') => {
    const { editor } = aceRef.current;

    const position = editor.getCursorPosition();

    editor.session.insert(position, suggested.replace(search, ''));

    setSuggestionsList([]);

    const droppedState = editor.session.getValue();

    try {
      const parsed = JSON.parse(droppedState);

      editor.session.setValue(JSON.stringify(parsed, null, 4));

      onSchemaChange(parsed);

      if (folds) {
        folds.forEach(({ start }) =>
          editor.session.$toggleFoldWidget(start.row, {}),
        );
      }

      editor.moveCursorTo(position.row, position.column + suggested.length);

      editor.focus();

      setAutoFocus(false);
    } catch (e) {
      console.log('parse error', e);
    }
  };

  const getSuggestion = (paths, search, prevSymbol) => {
    setSuggestionsList([]);

    const schema = JSON.parse(value);

    [].concat(paths).forEach((path) => {
      if (!path) return;

      const lastPathItem = path.split('.').filter(Boolean).pop();

      let pathToSuggests = findPath(schema, lastPathItem) + `.${lastPathItem}`;

      if (path.split('.').length > 1) {
        pathToSuggests = 'properties.' + pathToSuggests;
      }

      const stepSchema = objectPath.get(schema, pathToSuggests) || {};

      const suggests = Object.keys(stepSchema?.properties || stepSchema)
        .map((key) => key)
        .filter((suggest) => (search.length ? suggest.includes(search) : true));

      if (prevSymbol !== '.' && !search.length) {
        setSuggestionsList([]);
      } else {
        setSuggestionsList(suggests);
      }
    });
  };

  const showSuggestionHandler = ({ cursor: { row, column } }) => {
    try {
      const { editor } = aceRef?.current;

      const line = editor.session.getLine(row);

      const prevSymbol = editor.session.getLine(row)[column - 1];

      const schema = JSON.parse(value);
      const posStart = line.indexOf(': "');
      const posStartSpace = line.indexOf(' ');
      const posEnd = line.indexOf('.');

      const keyWord = [
        line.slice(posStart + posStart.length, posEnd),
        line.slice(posStartSpace + posStartSpace.length, posEnd),
      ];

      const replaceSpecialSymbols = (str) =>
        str
          .replace(/"[^"]*"/, '""')
          .replace(/[^a-zA-Z0-9.]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/\./g, ' ')
          .trim();

      const toSuggest = [];

      keyWord.forEach((word) => toSuggest.push(line.replace(word, '')));

      const toSuggestMapped = toSuggest
        .concat(keyWord)
        .map((str) =>
          replaceSpecialSymbols(str)
            .split(' ')
            .filter((part) => findPath(schema, part))
            .join('.'),
        )
        .filter(Boolean);

      const uniqueSuggest = [...new Set(toSuggestMapped)][0];

      const filterString = toSuggest.map((word) => {
        const search = word.split(';')[0];
        return replaceSpecialSymbols(search.replace(uniqueSuggest, ''));
      });

      const uniqueFilterString = [...new Set(filterString)][0];

      setSearch(uniqueFilterString);

      getSuggestion(uniqueSuggest, uniqueFilterString, prevSymbol);
    } catch (e) {
      console.log(e);
    }
  };

  const Suggester = ({ headerHeight = 0 }) => {
    if (!suggestionsList.length) return null;

    const { editor } = aceRef.current;

    const { row, column } = editor.getCursorPosition();

    const { scrollTop } = editor.renderer;

    const { top, left } = editor.renderer.$cursorLayer.getPixelPosition({
      row,
      column,
    });

    const leftSideBarWidth = 80;

    const styles = {
      top: top - scrollTop + 20 + headerHeight,
      left: left + leftSideBarWidth,
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
  };

  return {
    showSuggestionHandler,
    Suggester,
  };
};

export default useSelection;
