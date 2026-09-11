/* eslint-disable no-template-curly-in-string */
/* eslint-disable no-restricted-globals */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import objectPath from 'object-path';
import cleenDeep from 'clean-deep';
import evaluate from 'helpers/evaluate';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import Select from 'components/Select';
import { ChangeEvent } from 'components/JsonSchema';
import FieldLabel from 'components/JsonSchema/components/FieldLabel';

class DynamicSelect extends React.Component {
  handleChange = (selected) => {
    const { onChange, multiple, idFieldName } = this.props;

    const options = this.getOptions() || [];

    const selectedOptionsIds = []
      .concat(selected)
      .filter(Boolean)
      .map(({ id, [idFieldName]: customId }) => id || customId);

    const selectedOptions = options
      .filter(({ id }) => selectedOptionsIds.includes(id))
      .map((option) => {
        if (idFieldName) {
          delete option.id;
        }

        return option;
      });

    onChange(
      new ChangeEvent(
        multiple ? selectedOptions : selectedOptions.shift(),
        true,
      ),
    );
  };

  getOptions = () => {
    const {
      dataPath,
      rootDocument,
      isPopup,
      documents,
      options: schemaOptions,
      pathIndex,
      path,
    } = this.props;

    if (!dataPath && !schemaOptions) return [];

    let actualDataPath = dataPath;

    if (pathIndex) {
      const pathIndexes = path.filter((item) => !isNaN(item));

      actualDataPath = pathIndexes.reduce((acc, item) => {
        return acc?.replace('${index}', item);
      }, dataPath);
    }

    const dataSource = isPopup
      ? documents?.rootDocument?.data
      : rootDocument?.data;

    if (!dataSource) return [];

    const options = schemaOptions || objectPath.get(dataSource, actualDataPath);

    if (!options || !Array.isArray(options)) return null;

    const cleared = options
      .filter(Boolean)
      .filter((value) => Object.keys(value).length !== 0);

    const mapped = cleared.map((el, i) => cleenDeep(this.mapData(el, i)));

    return mapped;
  };

  mapData = (opt, i) => {
    const { dataMapping, documents } = this.props;

    const option = { ...opt };

    option.id = this.setOptionId(option, i);
    option.label = this.setOptionLabel(option);

    if (!dataMapping) return option;

    const result = evaluate(
      dataMapping,
      option,
      i,
      documents?.rootDocument?.data,
    );

    if (result instanceof Error) return option;

    result.label = this.setOptionLabel(result);

    return result;
  };

  defTitle = (option) => {
    if (option.label) return option.label;

    let string = '';

    Object.keys(option).forEach((item) => {
      if (item === 'id') return;
      string += ' ' + option[item];
    });

    return string;
  };

  setOptionLabel = (option) => {
    const { labelKeys, idFieldName } = this.props;

    if (idFieldName && labelKeys) {
      return null;
    }

    return labelKeys ? this.setTitle(option) : this.defTitle(option);
  };

  setOptionId = (option, i) => {
    const { idFieldName } = this.props;

    if (option.id) {
      return option.id;
    }

    if (idFieldName) {
      return option[idFieldName];
    }

    return `${this.defTitle(option).trim()}_${i}`.replace(/ /g, '.');
  };

  setTitle = (option) => {
    const { labelKeys } = this.props;

    return (labelKeys || [])
      .map((el) => el && option[el] && option[el])
      .join(' ');
  };

  getValue = () => {
    const { multiple, value } = this.props;

    const toOption = (option) => ({
      ...option,
      value: option.id,
    });

    const selected = [].concat(value).filter(Boolean).map(toOption);

    return multiple ? selected : selected.shift();
  };

  componentDidUpdate = () => {
    const { value, onChange, options: schemaOptions, idFieldName } = this.props;

    if (!value || schemaOptions) return;

    const options = this.getOptions();

    if (!options) return;

    const existing = options.find(({ id, [idFieldName]: customId }) =>
      [id, customId].includes(value.id),
    );

    if (!existing) onChange(undefined);
  };

  render = () => {
    const {
      description,
      required,
      error,
      hidden,
      path,
      notRequiredLabel,
      ...rest
    } = this.props;

    if (hidden) return null;

    const options = this.getOptions() || [];

    return (
      <ElementContainer
        {...rest}
        required={required}
        error={error}
        description={null}
        bottomSample={true}
      >
        <Select
          {...this.props}
          description={
            description ? (
              <FieldLabel
                description={description}
                required={required}
                notRequiredLabel={notRequiredLabel}
              />
            ) : (
              ''
            )
          }
          id={path.join('-')}
          options={options}
          value={this.getValue()}
          onChange={this.handleChange}
          aria-label={description}
        />
      </ElementContainer>
    );
  };
}

DynamicSelect.propTypes = {
  onChange: PropTypes.func,
  error: PropTypes.object,
  description: PropTypes.string,
  required: PropTypes.bool,
  dataPath: PropTypes.string.isRequired,
  rootDocument: PropTypes.object.isRequired,
  hidden: PropTypes.bool,
  path: PropTypes.array.isRequired,
  labelKeys: PropTypes.array,
  dataMapping: PropTypes.string,
  multiple: PropTypes.bool,
  isPopup: PropTypes.bool,
  idFieldName: PropTypes.string,
  pathIndex: PropTypes.object,
};

DynamicSelect.defaultProps = {
  onChange: null,
  error: null,
  description: null,
  required: false,
  hidden: false,
  labelKeys: null,
  dataMapping: null,
  multiple: false,
  isPopup: false,
  idFieldName: null,
  pathIndex: null,
};

export default DynamicSelect;
