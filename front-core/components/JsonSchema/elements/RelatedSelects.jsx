import React from 'react';
import PropTypes from 'prop-types';

import Select from 'components/Select';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import ElementGroupContainer from 'components/JsonSchema/components/ElementGroupContainer';
import deepObjectFind from 'helpers/deepObjectFind';

class RelatedSelectsComponent extends React.Component {
  isVisible = (level) => {
    if (level === 0) {
      return true;
    }

    const { value, properties } = this.props;
    const parentKey = Object.keys(properties)[level - 1];

    return !!(value || {})[parentKey] && this.getOptions(level).length;
  };

  getOptions = (level) => {
    const { value, options, properties } = this.props;
    const parentKey = Object.keys(properties)[level - 1];

    if (!parentKey) {
      return options.map((option) => ({
        ...option,
        value: option.id,
        label: option.name,
      }));
    }

    const items = []
      .concat(value[parentKey])
      .filter(Boolean)
      .map(
        ({ id: parentItemId }) =>
          deepObjectFind(options, (option) => option.id === parentItemId)
            .items || [],
      );

    return []
      .concat(...items)
      .map((option) => ({ ...option, value: option.id, label: option.name }));
  };

  handleChange = (propertyName) => (value) => {
    const { value: oldValue, onChange, properties, multiple } = this.props;
    const propertyNames = Object.keys(properties);
    const propertyIndex = propertyNames.indexOf(propertyName);

    const newValue = { ...(oldValue || {}), [propertyName]: value };
    propertyNames
      .filter((child, index) => index > propertyIndex)
      .forEach((child) => {
        const childPropertyIndex = propertyNames.indexOf(child);
        const parentPropertyName = propertyNames[childPropertyIndex - 1];
        const parentPropertyChildren = []
          .concat(newValue[parentPropertyName])
          .filter(Boolean)
          .map(({ items }) => items);
        const parentPropertyChildIds = []
          .concat(...parentPropertyChildren)
          .filter(Boolean)
          .map(({ id }) => id);

        const childValue = []
          .concat(newValue[child])
          .filter(Boolean)
          .filter(({ id }) => parentPropertyChildIds.includes(id));

        newValue[child] = multiple ? childValue : childValue.shift();
      });

    onChange && onChange(newValue);
  };

  renderProperty = (propertyName, level) => {
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
        )}
      >
        <Select
          {...rest}
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
        variant={typography}
        outlined={outlined}
        description={description}
        sample={sample}
        error={error}
        required={required}
        width={width}
        maxWidth={maxWidth}
        {...rest}
      >
        {Object.keys(properties).map(this.renderProperty)}
      </ElementGroupContainer>
    );
  }
}

RelatedSelectsComponent.propTypes = {
  records: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  properties: PropTypes.object,
  description: PropTypes.string,
  sample: PropTypes.string,
  value: PropTypes.object,
  errors: PropTypes.object,
  multiple: PropTypes.bool,
  onChange: PropTypes.func,
  required: PropTypes.oneOfType([PropTypes.array, PropTypes.bool]),
  path: PropTypes.array,
  outlined: PropTypes.bool,
  typography: PropTypes.string,
};

RelatedSelectsComponent.defaultProps = {
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

export default RelatedSelectsComponent;
