/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { translate, Translate } from 'react-translate';
import DataTable from 'components/DataTable';
import dataTableSettings from './dataTableSettings';
import emptyValues from '../../emptyValues';
import ChangeEvent from '../../ChangeEvent';
import ElementGroupContainer from '../../components/ElementGroupContainer';
import { JsonSchemaNode } from '../../types';

interface TableElementProps {
  t: Translate;
  sample?: string;
  description?: string;
  items: JsonSchemaNode & { type?: string; properties?: Record<string, JsonSchemaNode> };
  actions?: Record<string, unknown>;
  required?: boolean;
  error?: unknown;
  errors?: unknown[];
  hidden?: boolean;
  typography?: string;
  value: Record<string, unknown>;
  allowEmpty?: boolean;
  path?: Array<string | number>;
  onChange: ((event: InstanceType<typeof ChangeEvent> | unknown[]) => void) | null;
  maxRows?: number | false;
  toolbar?: boolean;
  rows?: string[] | false;
  [key: string]: unknown;
}

class TableElement extends React.Component<TableElementProps> {
  static defaultProps: Partial<TableElementProps> = {
    errors: [],
    allowEmpty: false,
    path: [],
    maxRows: false,
    toolbar: true,
    typography: 'body1',
  };

  componentDidMount = () => {
    const { value, onChange, allowEmpty } = this.props;
    if (!value && !allowEmpty) {
      onChange?.(this.getItems());
    }
  };

  handleAddItem = () => {
    const { onChange, items } = this.props;
    onChange?.(
      this.getItems().concat([emptyValues[(items.type as keyof typeof emptyValues) || 'object']]),
    );
  };

  handleDeleteItem = (index: number) => () => {
    const { onChange, value, allowEmpty, items } = this.props;
    const arr = Object.values(value);
    arr.splice(index, 1);

    if (!allowEmpty && !arr.length) {
      arr.push(emptyValues[(items.type as keyof typeof emptyValues) || 'object']);
    }

    onChange?.(new ChangeEvent(arr, false, true) as InstanceType<typeof ChangeEvent>);
  };

  getItems = (): unknown[] => {
    const { value, rows, items, allowEmpty } = this.props;

    const values = Object.values(value || {});
    if (rows && Array.isArray(rows)) {
      return rows.map(
        (row, index) =>
          values[index] ||
          emptyValues[((items.properties || items).type as keyof typeof emptyValues) || 'object'],
      );
    }

    return values.length || allowEmpty
      ? values
      : [emptyValues[((items.properties || items).type as keyof typeof emptyValues) || 'object']];
  };

  render() {
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
      ...(rest as Record<string, unknown>),
      t,
      data,
      errors,
      actions: {
        ...actions,
        addItem: this.handleAddItem,
        deleteItem: this.handleDeleteItem,
      },
      columns: (items.properties || items) as unknown as Record<string, JsonSchemaNode>,
    } as unknown as Parameters<typeof dataTableSettings>[0]);

    return (
      <ElementGroupContainer
        description={description}
        sample={sample}
        error={error}
        required={required}
        variant={typography as never}
        {...rest}
      >
        <DataTable {...dataSettings} data={data} hover={false} />
      </ElementGroupContainer>
    );
  }
}

export default translate('Elements')(TableElement);
