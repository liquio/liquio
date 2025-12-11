import React from 'react';

import { history } from 'store';

export default ({ processId }) => {
  React.useEffect(() => {
    history.replace(`/workflow/journal/${processId}`);
  });

  return null;
};
