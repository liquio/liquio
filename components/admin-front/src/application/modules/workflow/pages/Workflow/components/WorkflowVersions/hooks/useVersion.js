import React from 'react';
import { useDispatch } from 'react-redux';

import * as api from 'services/api';

const useVersion = (version, workflowId) => {
  const dispatch = useDispatch();

  const [data, setData] = React.useState();
  const [error, setError] = React.useState();

  React.useEffect(() => {
    const updateVersion = async () => {
      setData();

      if (!workflowId || !version) {
        return;
      }

      try {
        const results = await api.get(
          `bpmn-workflows/${workflowId}/versions/${version}`,
          'GET_WORKFLOW_VERSION',
          dispatch,
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
