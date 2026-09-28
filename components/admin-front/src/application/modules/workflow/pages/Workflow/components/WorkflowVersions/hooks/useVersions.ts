import React from 'react';
import { useDispatch } from 'react-redux';

import * as api from 'services/api';

interface Version {
  version?: string | number;
  isCurrentVersion?: boolean;
  [key: string]: unknown;
}

const useVersions = ({ workflowId, initWorkflow, lastWorkflowHistoryId }: {
  workflowId: string | number | undefined;
  initWorkflow: (arg: null, flag: boolean) => Promise<{ lastWorkflowHistory?: { id?: string | number } }>;
  lastWorkflowHistoryId?: string | number;
}) => {
  const dispatch = useDispatch();

  const [data, setData] = React.useState<Version[]>();
  const [error, setError] = React.useState<unknown>();

  const updateVersions = React.useCallback(
    async (clearData = true) => {
      clearData && setData(undefined);

      if (!workflowId) {
        return;
      }

      try {
        const results = (await api.get(
          `bpmn-workflows/${workflowId}/versions`,
          'GET_WORKFLOW_VERSIONS',
          dispatch as never,
        )) as Version[];
        setData(results);
      } catch (e) {
        setError(e);
      }
    },
    [dispatch, workflowId],
  );

  const createVersion = React.useCallback(
    async (newVersion: unknown) => {
      const { lastWorkflowHistory } = await initWorkflow(null, false);

      await api.post(
        `bpmn-workflows/${workflowId}/versions`,
        newVersion,
        'CREATE_WORKFLOW_VERSION',
        dispatch as never,
        {},
        {
          headers: {
            'Last-Workflow-History-Id':
              lastWorkflowHistory?.id || lastWorkflowHistoryId,
          },
        } as never,
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
