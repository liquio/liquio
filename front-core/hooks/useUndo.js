import React from 'react';
import diff from 'helpers/diff';

const useUndo = (value, onChange, { maxElements = 10 } = {}) => {
  const [past, setPast] = React.useState([value]);
  const [future, setFuture] = React.useState([]);

  React.useEffect(() => {
    const diffs =
      diff(value || {}, past[past.length - 1] || {}) &&
      diff(value || {}, future[future.length - 1] || {});
    if (!diffs) {
      return;
    }

    if (past.length === maxElements) {
      past.shift();
    }
    setPast([...past, value]);
  }, [value]);

  const undo = React.useCallback(() => {
    if (past.length <= 1) {
      return;
    }

    const element = past.pop();
    setPast([...past]);
    setFuture([...future, element]);

    setTimeout(() => {
      onChange(past[past.length - 1]);
    }, 250);
  }, [future, onChange, past]);

  const redo = React.useCallback(() => {
    if (future.length < 1) {
      return;
    }
    const element = future.pop();
    setFuture([...future]);
    setPast([...past, element]);

    setTimeout(() => {
      onChange(element);
    }, 250);
  }, [future, onChange, past]);

  return {
    undo,
    redo,
    hasNext: future.length > 0,
    hasPrevious: past.length > 1,
  };
};

export default useUndo;
