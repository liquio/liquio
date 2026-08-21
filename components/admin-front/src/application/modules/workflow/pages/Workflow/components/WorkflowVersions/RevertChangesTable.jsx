import React from 'react';

import DataTable from 'components/DataTable';
import { Checkbox } from '@mui/material';

import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

const RevertChangesTable = ({ disabled, changes, onSelect }) => (
  <DataTable
    data={changes}
    onRowClick={(row, itemIndex) =>
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
        render: (disabled) => (
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
        render: (value, { data, revert }) => {
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
        render: (name, { data }) => data?.taskTemplateEntity?.name || name,
      },
      {
        id: 'revert.name',
        render: (name, { revert }) => revert?.taskTemplateEntity?.name || name,
      },
    ]}
  />
);

export default RevertChangesTable;
