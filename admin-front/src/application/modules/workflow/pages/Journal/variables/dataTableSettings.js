import React from 'react';
import TimeLabel from 'components/Label/Time';
import LogDetails from '../components/LogDetails';
import JsonExpand from 'modules/workflow/pages/Journal/components/JsonExpand';
import TaskDetails from '../components/TaskDetails';
import SignatureList from '../components/SignatureList';
import AttachmentList from 'modules/workflow/pages/Journal/components/AttachmentList';
import DocumentMenu from 'modules/workflow/pages/Journal/components/DocumentMenu';
import DownloadEventFile from '../components/DownloadEventFile';
import ElasticMenu from '../components/ElasticMenu';
import Debug from '../components/Debug';
import StopDelayEvent from '../components/StopDelayEvent';
import SkipDelayEvent from '../components/SkipDelayEvent';
import { getConfig } from '../../../../../../core/helpers/configLoader';

const AWAIT_EVENT_ID = [2];

export default ({ t, processId, editable, search, workflowTemplateId, logs, checked }) => ({
  controls: {
    pagination: false,
    toolbar: false,
    search: false,
    header: true,
    refresh: false,
    customizateColumns: false
  },
  checkable: false,
  darkTheme: true,
  columns: [
    {
      id: 'createdAt',
      width: 160,
      sortable: false,
      name: t('CreatedAt'),
      render: (value) => <TimeLabel date={value} />
    },
    {
      id: 'updatedAt',
      width: 160,
      sortable: false,
      name: t('UpdatedAt'),
      render: (value) => <TimeLabel date={value} />
    },
    {
      id: 'type',
      width: 600,
      sortable: false,
      name: t('WorkflowLogType'),
      padding: 'none',
      disableTooltip: true,
      render: (value, log) => (
        <LogDetails checked={checked} processId={processId} log={log} search={search} />
      )
    },
    {
      id: 'details',
      sortable: false,
      name: t('Actions'),
      padding: 'none',
      render: (value, log) => (
        <>
          <JsonExpand value={value} {...log} />

          {log.type === 'task' && editable ? <TaskDetails log={log} processId={processId} /> : null}

          {log.type === 'error' ? <ElasticMenu log={log} processId={processId} /> : null}

          <SignatureList {...log} />

          <AttachmentList {...log} />

          <DocumentMenu {...log} />

          {getConfig().journalDebugMode ? (
            <Debug
              {...log}
              logs={logs}
              processId={processId}
              workflowTemplateId={workflowTemplateId}
            />
          ) : null}

          <DownloadEventFile {...value} />

          <StopDelayEvent {...log} processId={processId} delayId={AWAIT_EVENT_ID} />

          <SkipDelayEvent {...log} processId={processId} delayId={AWAIT_EVENT_ID} />
        </>
      )
    }
  ]
});
