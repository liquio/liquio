import React from 'react';
import TimeLabelRaw from 'components/Label/Time';
import LogDetailsRaw from '../components/LogDetails';
import JsonExpandRaw from 'modules/workflow/pages/Journal/components/JsonExpand';
import TaskDetailsRaw from '../components/TaskDetails';
import SignatureListRaw from '../components/SignatureList';
import AttachmentListRaw from 'modules/workflow/pages/Journal/components/AttachmentList';
import DocumentMenuRaw from 'modules/workflow/pages/Journal/components/DocumentMenu';
import DownloadEventFileRaw from '../components/DownloadEventFile';
import ElasticMenuRaw from '../components/ElasticMenu';
import DebugRaw from '../components/Debug';
import StopDelayEventRaw from '../components/StopDelayEvent';
import SkipDelayEventRaw from '../components/SkipDelayEvent';
import { getConfig } from 'core/helpers/configLoader';

const TimeLabel = TimeLabelRaw as unknown as React.ComponentType<Record<string, unknown>>;
const LogDetails = LogDetailsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const JsonExpand = JsonExpandRaw as unknown as React.ComponentType<Record<string, unknown>>;
const TaskDetails = TaskDetailsRaw as unknown as React.ComponentType<Record<string, unknown>>;
const SignatureList = SignatureListRaw as unknown as React.ComponentType<Record<string, unknown>>;
const AttachmentList = AttachmentListRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DocumentMenu = DocumentMenuRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DownloadEventFile = DownloadEventFileRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ElasticMenu = ElasticMenuRaw as unknown as React.ComponentType<Record<string, unknown>>;
const Debug = DebugRaw as unknown as React.ComponentType<Record<string, unknown>>;
const StopDelayEvent = StopDelayEventRaw as unknown as React.ComponentType<Record<string, unknown>>;
const SkipDelayEvent = SkipDelayEventRaw as unknown as React.ComponentType<Record<string, unknown>>;

const AWAIT_EVENT_ID = [2];

interface LogRecord {
  type: string;
  [key: string]: unknown;
}

interface DataTableSettingsParams {
  t: (key: string) => string;
  processId: string | number;
  editable?: boolean;
  search?: string;
  workflowTemplateId?: string | number;
  logs: LogRecord[];
  checked?: boolean;
}

export default ({ t, processId, editable, search, workflowTemplateId, logs, checked }: DataTableSettingsParams) => ({
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
      render: (value: string) => <TimeLabel date={value} />
    },
    {
      id: 'updatedAt',
      width: 160,
      sortable: false,
      name: t('UpdatedAt'),
      render: (value: string) => <TimeLabel date={value} />
    },
    {
      id: 'type',
      width: 600,
      sortable: false,
      name: t('WorkflowLogType'),
      padding: 'none',
      disableTooltip: true,
      render: (value: unknown, log: LogRecord) => (
        <LogDetails checked={checked} processId={processId} log={log} search={search} />
      )
    },
    {
      id: 'details',
      sortable: false,
      name: t('Actions'),
      padding: 'none',
      render: (value: unknown, log: LogRecord) => (
        <>
          <JsonExpand value={value} {...log} />

          {log.type === 'task' && editable ? <TaskDetails log={log} processId={processId} /> : null}

          {log.type === 'error' ? <ElasticMenu log={log} processId={processId} /> : null}

          <SignatureList {...log} />

          <AttachmentList {...log} />

          <DocumentMenu {...log} />

          {(getConfig() as unknown as { journalDebugMode?: boolean }).journalDebugMode ? (
            <Debug
              {...log}
              logs={logs}
              processId={processId}
              workflowTemplateId={workflowTemplateId}
            />
          ) : null}

          <DownloadEventFile {...(value as Record<string, unknown>)} />

          <StopDelayEvent {...log} processId={processId} delayId={AWAIT_EVENT_ID} />

          <SkipDelayEvent {...log} processId={processId} delayId={AWAIT_EVENT_ID} />
        </>
      )
    }
  ]
});
