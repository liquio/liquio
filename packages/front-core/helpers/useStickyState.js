import React from 'react';

import waiter from 'helpers/waitForAction';

function useStickyState(defaultValue, key, clearTimeout) {
  const [value, setValue] = React.useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  React.useEffect(() => {
    if (value) {
      window.localStorage.setItem(key, JSON.stringify(value));

      if (clearTimeout) {
        waiter.addAction(
          key,
          () => {
            window.localStorage.removeItem(key);
          },
          clearTimeout,
        );
      }
    } else {
      window.localStorage.removeItem(key);
    }
  }, [key, value, clearTimeout]);
  return [value, setValue];
}

export default useStickyState;
