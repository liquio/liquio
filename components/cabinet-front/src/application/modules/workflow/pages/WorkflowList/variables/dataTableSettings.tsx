import React from 'react';
import { Chip } from '@mui/material';
import { Theme } from '@mui/material/styles';

import TimeLabelRaw from 'components/Label/Time';
import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';
import TableRowRaw from '../components/TableRow';
import controls from 'components/DataGridPremium/components/defaultProps';

const TimeLabel = TimeLabelRaw as unknown as React.ComponentType<Record<string, unknown>>;
const TableRow = TableRowRaw as unknown as React.ComponentType<Record<string, unknown>>;

const getStatusColor = (theme: Theme, workflowStatusId: number | null): string | undefined =>
  ({
    1: theme?.palette?.warning?.light,
    2: theme?.palette?.success?.light,
    3: theme?.palette?.error?.light,
    null: (theme?.palette?.action as { selected?: string })?.selected
  })[workflowStatusId as unknown as string];

interface WorkflowFilters {
  is_draft?: boolean;
  [key: string]: unknown;
}

interface WorkflowRow {
  number?: string | number;
  entryTaskFinishedAt?: string;
  lastStepLabel?: string;
  workflowStatusId?: number | null;
  statuses?: { label?: string }[];
  entryTask?: { document?: { updatedAt?: string } };
  updatedAt?: string;
  createdAt?: string;
  [key: string]: unknown;
}

const columns = (t: (key: string) => string, { is_draft }: WorkflowFilters, theme: Theme) => [
  {
    field: 'workflow.number',
    headerName: t('WorkflowNumber'),
    sortable: false,
    width: 160,
    renderCell: ({ row: { number } }: { row: WorkflowRow }) => number
  },
  {
    field: 'workflowTemplate.headerName',
    align: 'left',
    width: 400,
    sortable: false,
    headerName: t('WorkflowName'),
    renderCell: ({ row }: { row: WorkflowRow }) => <TableRow item={row} />
  },
  {
    field: 'workflowStatusId',
    headerName: t('LastStepLabel'),
    width: 160,
    renderCell: ({ row: { entryTaskFinishedAt, lastStepLabel, workflowStatusId, statuses } }: { row: WorkflowRow }) => (
      <Chip
        style={{
          cursor: 'inherit',
          backgroundColor: getStatusColor(theme, workflowStatusId as number)
        }}
        label={
          entryTaskFinishedAt && lastStepLabel
            ? capitalizeFirstLetter(lastStepLabel)
            : statuses?.length && !lastStepLabel && entryTaskFinishedAt
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
        renderCell: ({ row: { entryTask, updatedAt } }: { row: WorkflowRow }) => {
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
        renderCell: ({ row: { entryTaskFinishedAt, createdAt } }: { row: WorkflowRow }) => (
          <TimeLabel date={entryTaskFinishedAt || createdAt} />
        )
      }
];

interface DataTableSettingsParams {
  t: (key: string) => string;
  filters: WorkflowFilters;
  checkable?: boolean;
  theme: Theme;
}

export default ({ t, filters, checkable, theme }: DataTableSettingsParams) => ({
  checkable,
  controls,
  columns: columns(t, filters, theme)
});
