import React from 'react';

import TimeLabel from 'components/Label/Time';
import Deadline from 'components/Label/Deadline';
import UserNamesLabels from 'components/Label/UserNamesLabels';
import UnitNamesLabels from 'components/Label/UnitNamesLabels';
import TaskNameRaw from 'modules/tasks/pages/TaskList/components/TaskName';
import { formatUserName } from 'helpers/userName';
import controls from 'components/DataGridPremium/components/defaultProps';

const TaskName = TaskNameRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface TaskRow {
  document?: { number?: string };
  workflow: { number?: string; userData?: { userName?: string; isLegal?: boolean } };
  meta?: { applicationNumber?: string; applicantName?: string };
  performerUnits?: unknown[];
  performerUserNames?: string[];
  createdAt?: string;
  dueDate?: string;
  finished?: boolean;
  [key: string]: unknown;
}

const columns = (t: (key: string) => string) => [
  {
    field: 'workflow][number',
    headerName: t('DocumentNumber'),
    renderCell: ({ row: { document, workflow, meta } }: { row: TaskRow }) =>
      meta?.applicationNumber || document?.number || workflow?.number || ''
  },
  {
    field: 'name',
    headerName: t('TaskName'),
    sortable: false,
    width: 400,
    renderCell: ({ row }: { row: TaskRow }) => <TaskName task={row} />
  },
  {
    field: 'applicantName',
    headerName: t('Applicant'),
    sortable: false,
    renderCell: ({
      row: {
        workflow: { userData },
        meta
      }
    }: { row: TaskRow }) => meta?.applicantName || formatUserName(userData?.userName)
  },
  {
    field: 'applicantType',
    headerName: t('ApplicantType'),
    renderCell: ({
      row: {
        workflow: { userData }
      }
    }: { row: TaskRow }) =>
      userData?.isLegal !== undefined ? (userData.isLegal ? t('LegalEntity') : t('Individual')) : ''
  },
  {
    field: 'performerUnits',
    headerName: t('PerformerUnits'),
    renderCell: ({ row: { performerUnits } }: { row: TaskRow }) => (
      <UnitNamesLabels units={(performerUnits || []) as never} />
    )
  },
  {
    field: 'performerUserNames',
    headerName: t('Performer'),
    renderCell: ({ row: { performerUserNames } }: { row: TaskRow }) => (
      <UserNamesLabels userNames={performerUserNames || []} />
    )
  },
  {
    field: 'createdAt',
    headerName: t('createdAt'),
    width: 160,
    renderCell: ({ row: { createdAt } }: { row: TaskRow }) => <TimeLabel date={createdAt} />
  },
  {
    field: 'dueDate',
    headerName: t('deadline'),
    width: 160,
    renderCell: ({ row: { createdAt, dueDate, finished } }: { row: TaskRow }) => (
      <Deadline start={createdAt} end={dueDate} finished={finished} />
    )
  }
];

export default ({ t }: { t: (key: string) => string }) => ({
  checkable: false,
  controls,
  columns: columns(t),
  sort: { dueDate: 'asc' }
});
