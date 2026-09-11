/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import DeleteItemButton from 'components/JsonSchema/elements/Table/DeleteItemButton';
import AddItemButton from './AddItemButton';
import SchemaForm from '../../SchemaForm';

export default ({
  t,
  rows,
  errors,
  schema,
  actions,
  columns,
  onChange,
  fileStorage,
  path,
  data,
  readOnly,
  verticalAlign,
  parentValue,
  name,
  deteleActionAbsolute,
  fullWidth,
  maxRows,
  value,
  darkTheme,
  toolbar,
  ...rest
}) => {
  let tableColumns = [];

  if (rows) {
    tableColumns.push({
      variant: 'header',
      render: (value, item, columnKey, rowIndex) => rows[rowIndex],
    });
  }

  tableColumns = tableColumns.concat(
    Object.keys(columns).map((key) => {
      const { description, ...elementSchema } = columns[key];

      const { padding, cellStyle } = elementSchema;

      return {
        id: key,
        name: description,
        padding: padding || 'checkbox',
        cellStyle,
        disableEditPopup: elementSchema.disableEditPopup || false,
        path: path,
        render: (value, item, columnKey, rowIndex, modal) => {
          const replaceBr =
            value &&
            typeof value === 'string' &&
            !elementSchema.multiline &&
            !elementSchema.mode
              ? value.replace(/(?:\r\n|\r|\n)/gi, ' ')
              : value;

          const parentValueIndexed =
            parentValue[name] && parentValue[name][rowIndex];

          return (
            <SchemaForm
              {...rest}
              schema={
                modal
                  ? {
                      ...elementSchema,
                      autoFocus: true,
                      multiline: elementSchema.type === 'string',
                    }
                  : elementSchema
              }
              {...elementSchema}
              path={path.concat(rowIndex, key)}
              fileStorage={fileStorage}
              actions={actions}
              margin="none"
              description={''}
              value={replaceBr}
              errors={errors}
              required={
                Array.isArray(schema.required) && schema.required.includes(key)
              }
              onChange={onChange.bind(null, rowIndex, key)}
              noMargin={true}
              readOnly={readOnly}
              fullWidth={fullWidth}
              parentValue={parentValueIndexed}
            />
          );
        },
      };
    }),
  );

  if (!rows) {
    const cellStyle = darkTheme
      ? {
          border: 'none',
          paddingBottom: 15,
        }
      : {};

    tableColumns.push({
      disableEditPopup: true,
      width: '10px',
      padding: 'none',
      cellStyle,
      render: (value, item, columnKey, rowIndex) => (
        <DeleteItemButton
          absolute={deteleActionAbsolute}
          t={t}
          darkTheme={darkTheme}
          readOnly={readOnly}
          fullWidth={fullWidth}
          deleteItem={actions.deleteItem(rowIndex)}
        />
      ),
    });
  }

  const limit = maxRows && value && maxRows <= value.length;

  return {
    ...rest,
    actions,
    controls: {
      pagination: false,
      toolbar,
      bottomToolbar: true,
      search: false,
      header: !!(data && data.length),
      refresh: false,
      switchView: false,
      ...rest.controls,
    },
    checkable: false,
    cellStyle: { verticalAlign: verticalAlign || 'bottom' },
    errors,
    CustomToolbar: rows
      ? null
      : (props) =>
          limit ? null : <AddItemButton readOnly={readOnly} {...props} t={t} />,
    columns: tableColumns,
  };
};
