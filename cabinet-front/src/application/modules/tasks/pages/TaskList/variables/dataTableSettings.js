import React from 'react';

import TimeLabel from 'components/Label/Time';
import Deadline from 'components/Label/Deadline';
import UserNamesLabels from 'components/Label/UserNamesLabels';
import UnitNamesLabels from 'components/Label/UnitNamesLabels';
import TaskName from 'modules/tasks/pages/TaskList/components/TaskName';
import { formatUserName } from 'helpers/userName';
import controls from 'components/DataGridPremium/components/defaultProps';

const columns = (t) => [
  {
    field: 'workflow][number',
    headerName: t('DocumentNumber'),
    renderCell: ({ row: { document, workflow, meta } }) =>
      meta?.applicationNumber || document?.number || workflow?.number || ''
  },
  {
    field: 'name',
    headerName: t('TaskName'),
    sortable: false,
    width: 400,
    renderCell: ({ row }) => <TaskName task={row} />
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
    }) => meta?.applicantName || formatUserName(userData?.userName)
  },
  {
    field: 'applicantType',
    headerName: t('ApplicantType'),
    renderCell: ({
      row: {
        workflow: { userData }
      }
    }) =>
      userData?.isLegal !== undefined ? (userData.isLegal ? t('LegalEntity') : t('Individual')) : ''
  },
  {
    field: 'performerUnits',
    headerName: t('PerformerUnits'),
    renderCell: ({ row: { performerUnits } }) => <UnitNamesLabels units={performerUnits || []} />
  },
  {
    field: 'performerUserNames',
    headerName: t('Performer'),
    renderCell: ({ row: { performerUserNames } }) => (
      <UserNamesLabels userNames={performerUserNames || []} />
    )
  },
  {
    field: 'createdAt',
    headerName: t('createdAt'),
    width: 160,
    renderCell: ({ row: { createdAt } }) => <TimeLabel date={createdAt} />
  },
  {
    field: 'dueDate',
    headerName: t('deadline'),
    width: 160,
    renderCell: ({ row: { createdAt, dueDate, finished } }) => (
      <Deadline start={createdAt} end={dueDate} finished={finished} />
    )
  }
];

export default ({ t }) => ({
  checkable: false,
  controls,
  columns: columns(t),
  sort: { dueDate: 'asc' }
});
