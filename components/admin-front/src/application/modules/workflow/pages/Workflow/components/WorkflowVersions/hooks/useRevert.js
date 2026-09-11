import React from 'react';

import queueFactory from 'helpers/queueFactory';

import revertHandlers from 'modules/workflow/pages/Workflow/components/WorkflowVersions/revertHandlers';
import getChanges from 'modules/workflow/pages/Workflow/components/WorkflowVersions/helpers/getChanges';

const useRevert = (
  currentVersion,
  revertVersion,
  { t, workflowId, onRevert },
) => {
  const [busy, setBusy] = React.useState();
  const [error, setError] = React.useState();
  const [progress, setProgress] = React.useState();
  const [progressText, setProgressText] = React.useState();
  const [changes, setChanges] = React.useState(
    getChanges(currentVersion, revertVersion, { t, workflowId }),
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
    setChanges(getChanges(currentVersion, revertVersion, { t, workflowId }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVersion, revertVersion]);

  const start = React.useCallback(() => {
    if (!currentVersion || !revertVersion) {
      return;
    }

    const changesFiltered = changes.filter(({ disabled }) => !disabled);

    if (!changesFiltered.length) {
      return;
    }

    setProgress(0);

    queue.removeAllListeners('end');
    queue.removeAllListeners('error');
    queue.removeAllListeners('start');
    queue.removeAllListeners('success');

    queue.on('start', () => setBusy(true));
    queue.on('error', setError);

    queue.on('end', async () => {
      setBusy(false);
      setProgress();
      setProgressText();
    });

    queue.on('success', ({ data, revert, name }) => {
      const dataOrRevert = data || revert || { name };
      const progressName =
        dataOrRevert?.taskTemplateEntity?.name || dataOrRevert?.name;

      setProgress(
        (100 * (changesFiltered.length - queue.length)) /
          changesFiltered.length,
      );
      setProgressText(progressName);
    });

    changesFiltered.forEach((change) => queue.push(revertHandlers(change)));
    queue.push(onRevert);
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
