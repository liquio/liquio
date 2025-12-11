import { useState, useEffect } from 'react';

function useRefCollback() {
  const [node, setRef] = useState(null);

  useEffect(() => {
    if (node) {
      // Your Hook now has a reference to the ref element.
    }
  }, [node]);

  return [setRef];
}

export default useRefCollback;
