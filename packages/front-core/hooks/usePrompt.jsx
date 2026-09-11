import { useEffect } from 'react';

export default (when = false, message = '') => {
  void message;
  useEffect(() => {
    const onUnload = (event) => {
      if (!when) {
        return;
      }
      const listener = event || window.event;
      listener.preventDefault();

      if (listener) {
        listener.returnValue = '';
      }
      return '';
    };

    window.addEventListener('beforeunload', onUnload);

    return () => {
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [when]);
};
