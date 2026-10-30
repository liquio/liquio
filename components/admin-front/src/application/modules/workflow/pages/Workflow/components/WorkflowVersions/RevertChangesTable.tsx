import React from 'react';

import DataTableRaw from 'components/DataTable';
import { Checkbox } from '@mui/material';

import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface Change {
  id?: string | number;
  disabled?: boolean;
  data?: { taskTemplateEntity?: { name?: string }; name?: string } | null;
  revert?: { taskTemplateEntity?: { name?: string }; name?: string } | null;
  name?: string;
}

interface RevertChangesTableProps {
  disabled?: boolean;
  changes: Change[];
  onSelect: (changes: Change[]) => void;
}

const RevertChangesTable = ({ disabled, changes, onSelect }: RevertChangesTableProps) => (
  <DataTable
    data={changes}
    onRowClick={(row: unknown, itemIndex: number) =>
      onSelect(
        changes.map((item, index) => {
          if (disabled || itemIndex !== index) {
            return item;
          }

          return {
            ...item,
            disabled: !item.disabled,
          };
        }),
      )
    }
    controls={{
      pagination: false,
      toolbar: true,
      search: false,
      header: false,
      refresh: false,
      switchView: false,
      customizateColumns: false,
    }}
    columns={[
      {
        id: 'disabled',
        padding: 'checkbox',
        width: 10,
        render: (disabled: boolean) => (
          <Checkbox
            checked={!disabled}
            disabled={disabled}
            inputProps={{ 'aria-label': 'primary checkbox' }}
          />
        ),
      },
      {
        id: 'action',
        align: 'right',
        padding: 'checkbox',
        width: 10,
        render: (value: unknown, { data, revert }: Change) => {
          let icon = <AddBoxOutlinedIcon />;

          if (data) {
            icon = <DeleteOutlineOutlinedIcon />;
          }

          if (data && revert) {
            icon = <EditOutlinedIcon />;
          }

          return <div style={{ padding: '6px 0 0' }}>{icon}</div>;
        },
      },
      {
        id: 'name',
      },
      {
        id: 'data.name',
        render: (name: string, { data }: Change) => data?.taskTemplateEntity?.name || name,
      },
      {
        id: 'revert.name',
        render: (name: string, { revert }: Change) => revert?.taskTemplateEntity?.name || name,
      },
    ]}
  />
);

export default RevertChangesTable;
