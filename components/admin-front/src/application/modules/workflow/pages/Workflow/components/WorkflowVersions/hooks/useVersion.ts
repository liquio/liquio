import React from 'react';
import { useDispatch } from 'react-redux';

import * as api from 'services/api';

const useVersion = (version: string | number | undefined, workflowId: string | number | undefined) => {
  const dispatch = useDispatch();

  const [data, setData] = React.useState<unknown>();
  const [error, setError] = React.useState<unknown>();

  React.useEffect(() => {
    const updateVersion = async () => {
      setData(undefined);

      if (!workflowId || !version) {
        return;
      }

      try {
        const results = await api.get(
          `bpmn-workflows/${workflowId}/versions/${version}`,
          'GET_WORKFLOW_VERSION',
          dispatch as never,
        );
        setData(results);
      } catch (e) {
        setError(e);
      }
    };

    updateVersion();
  }, [dispatch, version, workflowId]);

  return { data, error, loading: !data && !error };
};

export default useVersion;
