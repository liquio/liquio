import React from 'react';

import { history } from 'store';

interface ProcessesProps {
  processId: string;
}

export default ({ processId }: ProcessesProps) => {
  React.useEffect(() => {
    history.replace(`/workflow/journal/${processId}`);
  });

  return null;
};
