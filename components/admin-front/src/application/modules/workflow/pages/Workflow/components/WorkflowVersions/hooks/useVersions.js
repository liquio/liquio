import React from 'react';
import { useDispatch } from 'react-redux';

import * as api from 'services/api';

const useVersions = ({ workflowId, initWorkflow, lastWorkflowHistoryId }) => {
  const dispatch = useDispatch();

  const [data, setData] = React.useState();
  const [error, setError] = React.useState();

  const updateVersions = React.useCallback(
    async (clearData = true) => {
      clearData && setData();

      if (!workflowId) {
        return;
      }

      try {
        const results = await api.get(
          `bpmn-workflows/${workflowId}/versions`,
          'GET_WORKFLOW_VERSIONS',
          dispatch,
        );
        setData(results);
      } catch (e) {
        setError(e);
      }
    },
    [dispatch, workflowId],
  );

  const createVersion = React.useCallback(
    async (newVersion) => {
      const { lastWorkflowHistory } = await initWorkflow(null, false);

      await api.post(
        `bpmn-workflows/${workflowId}/versions`,
        newVersion,
        'CREATE_WORKFLOW_VERSION',
        dispatch,
        {},
        {
          headers: {
            'Last-Workflow-History-Id':
              lastWorkflowHistory?.id || lastWorkflowHistoryId,
          },
        },
      );

      await initWorkflow(null, false);
      await updateVersions();
    },
    [dispatch, initWorkflow, lastWorkflowHistoryId, updateVersions, workflowId],
  );

  const currentVersion = React.useMemo(() => {
    const version = (data || []).find(
      ({ isCurrentVersion }) => isCurrentVersion,
    );
    return version?.version;
  }, [data]);

  React.useEffect(() => {
    updateVersions();
  }, [updateVersions]);

  return {
    data,
    error,
    loading: !data && !error,
    create: createVersion,
    current: currentVersion,
  };
};

export default useVersions;
