import React from 'react';

import SelectUntyped from 'components/Select';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import ElementGroupContainer from 'components/JsonSchema/components/ElementGroupContainer';
import deepObjectFind from 'helpers/deepObjectFind';

const Select = SelectUntyped as unknown as React.ComponentType<Record<string, unknown>>;

interface RelatedOption {
  id: unknown;
  name?: string;
  items?: RelatedOption[];
  [key: string]: unknown;
}

interface RelatedSelectsProps {
  records: Record<string, unknown>;
  actions: Record<string, unknown>;
  properties: Record<string, { helperText?: string; description?: string; [key: string]: unknown }>;
  description?: string;
  sample?: string;
  value?: Record<string, unknown>;
  errors: Array<{ path: string; [key: string]: unknown }>;
  multiple?: boolean;
  onChange?: (value: unknown) => void;
  required?: unknown[] | boolean;
  path: Array<string | number>;
  outlined?: boolean;
  typography?: string;
  options: RelatedOption[];
  error?: unknown;
  hidden?: boolean;
  width?: number | string;
  maxWidth?: number | string;
  noMargin?: boolean;
  [key: string]: unknown;
}

class RelatedSelectsComponent extends React.Component<RelatedSelectsProps> {
  static defaultProps = {
    properties: {},
    description: '',
    sample: '',
    value: {},
    errors: {},
    multiple: false,
    onChange: () => null,
    required: [],
    path: [],
    outlined: false,
    typography: 'subtitle1',
  };

  isVisible = (level: number) => {
    if (level === 0) {
      return true;
    }

    const { value, properties } = this.props;
    const parentKey = Object.keys(properties)[level - 1];

    return !!(value || {})[parentKey] && this.getOptions(level).length;
  };

  getOptions = (level: number): RelatedOption[] => {
    const { value, options, properties } = this.props;
    const parentKey = Object.keys(properties)[level - 1];

    if (!parentKey) {
      return options.map((option) => ({
        ...option,
        value: option.id,
        label: option.name,
      }));
    }

    const items = (([] as unknown[])
      .concat((value as Record<string, unknown>)[parentKey] as never)
      .filter(Boolean) as Array<{ id: unknown }>)
      .map(
        ({ id: parentItemId }) =>
          (deepObjectFind(options, (option) => (option as RelatedOption).id === parentItemId) as RelatedOption)
            ?.items || [],
      );

    return ([] as RelatedOption[])
      .concat(...(items as RelatedOption[][]))
      .map((option) => ({ ...option, value: option.id, label: option.name }));
  };

  handleChange = (propertyName: string) => (value: unknown) => {
    const { value: oldValue, onChange, properties, multiple } = this.props;
    const propertyNames = Object.keys(properties);
    const propertyIndex = propertyNames.indexOf(propertyName);

    const newValue: Record<string, unknown> = { ...(oldValue || {}), [propertyName]: value };
    propertyNames
      .filter((child, index) => index > propertyIndex)
      .forEach((child) => {
        const childPropertyIndex = propertyNames.indexOf(child);
        const parentPropertyName = propertyNames[childPropertyIndex - 1];
        const parentPropertyChildren = (([] as unknown[])
          .concat(newValue[parentPropertyName] as never)
          .filter(Boolean) as Array<{ items: unknown }>)
          .map(({ items }) => items);
        const parentPropertyChildIds = (([] as unknown[])
          .concat(...(parentPropertyChildren as unknown[][]))
          .filter(Boolean) as Array<{ id: unknown }>)
          .map(({ id }) => id);

        const childValue = ([] as Array<{ id: unknown }>)
          .concat(newValue[child] as never)
          .filter(Boolean)
          .filter(({ id }) => parentPropertyChildIds.includes(id));

        newValue[child] = multiple ? childValue : childValue.shift();
      });

    onChange && onChange(newValue);
  };

  renderProperty = (propertyName: string, level: number) => {
    const { properties, required, errors, value, path, noMargin, ...rest } =
      this.props;

    if (!this.isVisible(level)) {
      return null;
    }

    const property = properties[propertyName];
    const { helperText, description } = property;
    const options = this.getOptions(level);
    const propertyValue = (value || {})[propertyName];

    return (
      <ElementContainer
        noMargin={noMargin}
        sample={helperText}
        key={propertyName}
        required={
          Array.isArray(required) ? required.includes(propertyName) : required
        }
        bottomSample={true}
        error={errors.find(
          (error) => error.path === path.concat(propertyName).join('.'),
        ) as never}
      >
        <Select
          {...(rest as unknown as Record<string, unknown>)}
          id={path.concat(propertyName).join('-')}
          value={propertyValue}
          description={description}
          aria-label={description}
          onChange={this.handleChange(propertyName)}
          options={options}
        />
      </ElementContainer>
    );
  };

  render() {
    const {
      description,
      typography,
      sample,
      properties,
      error,
      required,
      outlined,
      hidden,
      width,
      maxWidth,
      ...rest
    } = this.props;

    if (hidden) return null;

    return (
      <ElementGroupContainer
        variant={typography as never}
        outlined={outlined}
        description={description}
        sample={sample}
        error={error as never}
        required={required as never}
        width={width as never}
        maxWidth={maxWidth as never}
        {...(rest as unknown as Record<string, unknown>)}
      >
        {Object.keys(properties).map(this.renderProperty)}
      </ElementGroupContainer>
    );
  }
}

export default RelatedSelectsComponent;
