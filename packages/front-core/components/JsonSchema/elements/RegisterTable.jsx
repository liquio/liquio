import React from 'react';
import PropTypes from 'prop-types';

import DataTable from 'components/DataTable';

import SchemaForm from '../SchemaForm';
import ElementGroupContainer from '../components/ElementGroupContainer';

const RegisterTable = ({
  sample,
  description,
  value,
  items,
  typography,
  required,
  error,
  errors,
  path,
  onChange,
  hidden,
  ...rest
}) => {
  if (hidden) return null;
  return (
    <ElementGroupContainer
      description={description}
      sample={sample}
      error={error}
      required={required}
      variant={typography}
      {...rest}
    >
      <DataTable
        data={value || []}
        cellStyle={{ verticalAlign: 'baseline' }}
        columns={Object.keys(items).map((key) => ({
          ...items[key],
          id: key,
          name: items[key].description,
          padding: 'checkbox',
          render: (columnValue, item, columnKey, rowIndex) => (
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

RegisterTable.propTypes = {
  value: PropTypes.array,
  onChange: PropTypes.func,
};

RegisterTable.defaultProps = {
  value: null,
  onChange: () => null,
};

export default RegisterTable;
