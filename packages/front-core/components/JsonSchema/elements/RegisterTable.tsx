import React from 'react';

import DataTable from 'components/DataTable';

import SchemaForm from '../SchemaForm';
import ElementGroupContainer from '../components/ElementGroupContainer';

interface RegisterTableItem {
  description?: string;
  [key: string]: unknown;
}

interface RegisterTableProps {
  sample?: string;
  description?: string;
  value?: unknown[] | null;
  items: Record<string, RegisterTableItem>;
  typography?: string;
  required?: boolean;
  error?: unknown;
  errors?: unknown[];
  path: Array<string | number>;
  onChange: (rowIndex: number, key: string, ...args: unknown[]) => void;
  hidden?: boolean;
  [key: string]: unknown;
}

const RegisterTable = ({
  sample,
  description,
  value = null,
  items,
  typography,
  required,
  error,
  errors,
  path,
  onChange = () => null,
  hidden,
  ...rest
}: RegisterTableProps) => {
  if (hidden) return null;
  return (
    <ElementGroupContainer
      description={description}
      sample={sample}
      error={error as never}
      required={required}
      variant={typography as never}
      {...(rest as unknown as Record<string, unknown>)}
    >
      <DataTable
        data={value || []}
        cellStyle={{ verticalAlign: 'baseline' }}
        columns={Object.keys(items).map((key) => ({
          ...items[key],
          id: key,
          name: items[key].description,
          padding: 'checkbox',
          render: (columnValue: unknown, item: unknown, columnKey: unknown, rowIndex: number) => (
            <SchemaForm
              schema={items[key]}
              path={path.concat(rowIndex, key)}
              margin="none"
              description={''}
              value={columnValue}
              errors={errors}
              required={true}
              onChange={onChange.bind(null, rowIndex, key)}
            />
          ),
        }))}
        controls={{
          pagination: false,
          toolbar: false,
          search: false,
          header: false,
          refresh: false,
          switchView: false,
        }}
      />
    </ElementGroupContainer>
  );
};

export default RegisterTable;
