import React from 'react';

import InitialState from 'modules/registry/pages/RegistryReforged/components/InitialState';

const arrayToObject = (array: string[], value: boolean): Record<string, boolean> => {
  return array.reduce((obj: Record<string, boolean>, item) => {
    obj[item] = value;
    return obj;
  }, {});
};

interface SchemaProperty {
  description?: string;
  hidden?: boolean;
  disableSort?: boolean;
  dateFormat?: string;
  control?: string;
  editingEnabled?: boolean;
  width?: number | string;
  hiddenSearch?: boolean;
}

interface SelectedKey {
  schema?: {
    toTable?: unknown;
    properties?: Record<string, SchemaProperty>;
    hiddenColumns?: string[];
  };
}

interface Column {
  field?: string;
  headerName?: string;
  hidden?: boolean;
  sortable?: boolean;
  dateFormat?: string;
  control?: string;
  editingEnabled?: boolean;
  propertyName?: string;
  width?: number | string;
  hiddenSearch?: boolean;
  renderCell?: (params: Record<string, unknown>) => React.ReactNode;
  [key: string]: unknown;
}

interface PropsToStateParams {
  t: (key: string) => string;
  selectedKey?: SelectedKey;
  renderTableCell: (params: { row: unknown; column: Column; isHistory?: boolean }) => React.ReactNode;
  renderHeaderFilter?: (column: Column) => React.ReactNode;
  isHistory?: boolean;
}

const propsToState = ({ t, selectedKey, renderTableCell, renderHeaderFilter, isHistory }: PropsToStateParams) => {
  const defaultProps = InitialState(t, isHistory);

  if (!selectedKey || !selectedKey.schema) {
    return defaultProps;
  }

  let customColumns: string[] = [];

  if (typeof selectedKey.schema.toTable === 'object') {
    customColumns = Object.keys(selectedKey.schema.toTable as object);
  } else {
    customColumns = Object.keys(selectedKey.schema.properties || {});
  }

  const mapColumns: Column[] = [
    ...(defaultProps.columns as unknown as Column[]),
    ...customColumns.map((propertyName): Column => {
      const field = ['data', propertyName].join('.');
      const property = (selectedKey.schema?.properties || {})[propertyName] || {};
      return {
        field,
        headerName: property.description || propertyName,
        hidden: !!property.hidden,
        sortable: !property.disableSort,
        dateFormat: property.dateFormat,
        control: property.control,
        editingEnabled: property.editingEnabled,
        propertyName,
        width: property.width,
        hiddenSearch: property.hiddenSearch
      };
    })
  ];

  const hiddenColumnsOrigin = (selectedKey?.schema?.hiddenColumns || []).map(
    (item) => `data.${item}`
  );

  return {
    columns: mapColumns.map((item) => {
      const isActions = item?.control === 'file';

      const renderCell = item?.renderCell
        ? item?.renderCell
        : ({ row }: { row: unknown }) => renderTableCell({ row, column: item, isHistory });

      return {
        ...item,
        type: isActions ? 'actions' : null,
        renderCell: isActions ? null : renderCell,
        renderHeaderFilter: () =>
          renderHeaderFilter && !item?.hiddenSearch ? renderHeaderFilter(item) : null,
        getActions: isActions ? renderCell : null
      };
    }),
    hiddenColumns: arrayToObject((defaultProps.hiddenColumns as string[]).concat(hiddenColumnsOrigin), false),
    customColumns: customColumns.map((propertyName) => ['data', propertyName].join('.'))
  };
};

export default propsToState;
