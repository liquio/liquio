/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import DataTable from 'components/DataTable';
import dataTableSettings from './dataTableSettings';
import emptyValues from '../../emptyValues';
import ChangeEvent from '../../ChangeEvent';
import ElementGroupContainer from '../../components/ElementGroupContainer';

class TableElement extends React.Component {
  componentDidMount = () => {
    const { value, onChange, allowEmpty } = this.props;
    if (!value && !allowEmpty) {
      onChange && onChange(this.getItems());
    }
  };

  handleAddItem = () => {
    const { onChange, items } = this.props;
    onChange &&
      onChange(this.getItems().concat([emptyValues[items.type || 'object']]));
  };

  handleDeleteItem = (index) => () => {
    const { onChange, value, allowEmpty, items } = this.props;
    const arr = Object.values(value);
    arr.splice(index, 1);

    if (!allowEmpty && !arr.length) {
      arr.push(emptyValues[items.type || 'object']);
    }

    onChange && onChange(new ChangeEvent(arr, false, true));
  };

  getItems = () => {
    const { value, rows, items, allowEmpty } = this.props;

    const values = Object.values(value || {});
    if (rows && Array.isArray(rows)) {
      return rows.map(
        (row, index) =>
          values[index] ||
          emptyValues[(items.properties || items).type || 'object'],
      );
    }

    return values.length || allowEmpty
      ? values
      : [emptyValues[(items.properties || items).type || 'object']];
  };

  render = () => {
    const {
      t,
      sample,
      description,
      items,
      actions,
      required,
      error,
      errors,
      hidden,
      typography,
      ...rest
    } = this.props;

    if (hidden) return null;

    const data = this.getItems();

    const dataSettings = dataTableSettings({
      ...rest,
      t,
      data,
      errors,
      actions: {
        ...actions,
        addItem: this.handleAddItem,
        deleteItem: this.handleDeleteItem,
      },
      columns: items.properties || items,
    });

    return (
      <ElementGroupContainer
        description={description}
        sample={sample}
        error={error}
        required={required}
        variant={typography}
        {...rest}
      >
        <DataTable {...dataSettings} data={data} hover={false} />
      </ElementGroupContainer>
    );
  };
}

TableElement.propTypes = {
  errors: PropTypes.array,
  value: PropTypes.array.isRequired,
  allowEmpty: PropTypes.bool,
  path: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  maxRows: PropTypes.number,
  toolbar: PropTypes.bool,
  typography: PropTypes.string,
};

TableElement.defaultProps = {
  errors: [],
  allowEmpty: false,
  path: [],
  maxRows: false,
  toolbar: true,
  typography: 'body1',
};

export default translate('Elements')(TableElement);
