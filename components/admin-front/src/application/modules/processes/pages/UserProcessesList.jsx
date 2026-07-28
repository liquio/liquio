import React from 'react';
import { history } from 'store';

export default () => {
  React.useEffect(() => {
    history.replace('/workflow/journal');
  });

  return null;
};
