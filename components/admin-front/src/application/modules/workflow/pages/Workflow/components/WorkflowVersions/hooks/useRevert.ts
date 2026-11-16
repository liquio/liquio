import React from 'react';

import queueFactory, { addQueueListener, removeQueueListeners } from 'helpers/queueFactory';

import revertHandlers from 'modules/workflow/pages/Workflow/components/WorkflowVersions/revertHandlers';
import getChanges from 'modules/workflow/pages/Workflow/components/WorkflowVersions/helpers/getChanges';

interface Change {
  id?: string | number;
  type: string;
  disabled?: boolean;
  data?: { taskTemplateEntity?: { name?: string }; name?: string } | null;
  revert?: { taskTemplateEntity?: { name?: string }; name?: string } | null;
}

interface VersionLike {
  version?: string | number;
  [key: string]: unknown;
}

const useRevert = (
  currentVersion: VersionLike | undefined,
  revertVersion: VersionLike | undefined,
  { t, workflowId, onRevert }: { t: (key: string) => string; workflowId: unknown; onRevert: () => void },
) => {
  const [busy, setBusy] = React.useState<boolean>();
  const [error, setError] = React.useState<Error>();
  const [progress, setProgress] = React.useState<number>();
  const [progressText, setProgressText] = React.useState<string>();
  const [changes, setChanges] = React.useState<Change[]>(
    getChanges(currentVersion as never, revertVersion as never, { t, workflowId }) as unknown as Change[],
  );

  const queue = React.useMemo(() => {
    if (!currentVersion || !revertVersion) {
      return null;
    }

    return queueFactory.get(
      [currentVersion.version, revertVersion.version].join(),
    );
  }, [currentVersion, revertVersion]);

  React.useEffect(() => {
    setChanges(getChanges(currentVersion as never, revertVersion as never, { t, workflowId }) as unknown as Change[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVersion, revertVersion]);

  const start = React.useCallback(() => {
    if (!currentVersion || !revertVersion || !queue) {
      return;
    }

    const changesFiltered = changes.filter(({ disabled }) => !disabled);

    if (!changesFiltered.length) {
      return;
    }

    setProgress(0);

    removeQueueListeners(queue, 'end');
    removeQueueListeners(queue, 'error');
    removeQueueListeners(queue, 'start');
    removeQueueListeners(queue, 'success');

    addQueueListener(queue, 'start', () => setBusy(true));
    addQueueListener(queue, 'error', ({ detail }) => setError(detail.error));

    addQueueListener(queue, 'end', async () => {
      setBusy(false);
      setProgress(undefined);
      setProgressText(undefined);
    });

    addQueueListener(queue, 'success', ({ detail }) => {
      const jobResult = detail.result[0] as (Change & { name?: string }) | undefined;

      if (!jobResult) return;

      const { data, revert, name } = jobResult;
      const dataOrRevert = data || revert || { name };
      const progressName =
        dataOrRevert?.taskTemplateEntity?.name || dataOrRevert?.name;

      setProgress(
        (100 * (changesFiltered.length - queue.length)) /
          changesFiltered.length,
      );
      setProgressText(progressName);
    });

    changesFiltered.forEach((change) => queue.push(revertHandlers(change as never) as never));
    queue.push(onRevert as never);
  }, [changes, currentVersion, onRevert, queue, revertVersion]);

  return {
    busy,
    start,
    error,
    changes,
    progress,
    progressText,
    active: !!queue,
    onSelectChanges: setChanges,
  };
};

export default useRevert;
