import React from 'react';
import { Chip } from '@mui/material';

import TimeLabel from 'components/Label/Time';
import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';
import TableRow from '../components/TableRow';
import controls from 'components/DataGridPremium/components/defaultProps';

const colors = {
  1: '#FFD79D',
  2: '#AEE9D1',
  3: '#FED3D1',
  null: '#E4E5E7'
};

const columns = (t, { is_draft }) => [
  {
    field: 'workflow.number',
    headerName: t('WorkflowNumber'),
    sortable: false,
    width: 160,
    renderCell: ({ row: { number } }) => number
  },
  {
    field: 'workflowTemplate.headerName',
    align: 'left',
    width: 400,
    sortable: false,
    headerName: t('WorkflowName'),
    renderCell: ({ row }) => <TableRow item={row} />
  },
  {
    field: 'workflowStatusId',
    headerName: t('LastStepLabel'),
    width: 160,
    renderCell: ({ row: { entryTaskFinishedAt, lastStepLabel, workflowStatusId, statuses } }) => (
      <Chip
        style={{
          cursor: 'inherit',
          backgroundColor: colors[workflowStatusId]
        }}
        label={
          entryTaskFinishedAt && lastStepLabel
            ? capitalizeFirstLetter(lastStepLabel)
            : statuses.length && !lastStepLabel && entryTaskFinishedAt
            ? statuses[statuses.length - 1]?.label
            : entryTaskFinishedAt && !lastStepLabel
            ? t('NoStatus')
            : t('DraftStatus')
        }
      />
    )
  },
  is_draft
    ? {
        field: 'documents.updatedAt',
        headerName: t('UpdatedAt'),
        width: 160,
        sortable: false,
        renderCell: ({ row: { entryTask, updatedAt } }) => {
          if (entryTask?.document?.updatedAt) {
            return <TimeLabel date={entryTask?.document?.updatedAt} />;
          }
          if (updatedAt) {
            return <TimeLabel date={updatedAt} />;
          }
          return null;
        }
      }
    : {
        field: 'tasks.finishedAt',
        headerName: t('OrderedAt'),
        sortable: false,
        width: 160,
        renderCell: ({ row: { entryTaskFinishedAt, createdAt } }) => (
          <TimeLabel date={entryTaskFinishedAt || createdAt} />
        )
      }
];

export default ({ t, filters, checkable }) => ({
  checkable,
  controls,
  columns: columns(t, filters)
});
