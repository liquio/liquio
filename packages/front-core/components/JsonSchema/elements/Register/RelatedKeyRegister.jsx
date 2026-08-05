import React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { ChangeEvent } from 'components/JsonSchema';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import ElementGroupContainer from 'components/JsonSchema/components/ElementGroupContainer';

import Select from 'components/Select';

import { requestRegisterRelatedKeyRecords } from 'application/actions/registry';
import processList from 'services/processList';
import equilPath from 'helpers/equilPath';
import defaultProps from 'components/JsonSchema/elements/Register/defaultProps';
import evaluate from 'helpers/evaluate';

const toOption = (option) =>
  option && {
    ...option,
    label: option && option.stringified,
    value: option && option.id,
  };

class RelatedKeyRegister extends React.Component {
  async componentDidMount() {
    await this.init();
  }

  async componentDidUpdate() {
    await this.init();
  }

  init = async () => {
    const {
      records,
      actions,
      value,
      demo,
      originDocument,
      cleanWhenHidden,
      hidden,
      excludeList,
    } = this.props;
    const keyIds = this.getKeyIds();

    let keyRecords;

    if (!demo && !(originDocument && originDocument.isFinal)) {
      const params = excludeList
        ? `excludeList=${JSON.stringify(excludeList)}`
        : false;

      keyRecords =
        records[keyIds] ||
        (await processList.hasOrSet(
          'requestRegisterRelatedKeyRecords',
          actions.requestRegisterRelatedKeyRecords,
          keyIds,
          params,
        ));
    }

    if (keyRecords instanceof Error || !value || value.propertiesHasOptions) {
      return;
    }

    const { onChange } = this.props;

    if (cleanWhenHidden && hidden) {
      return;
    }

    onChange &&
      onChange(
        new ChangeEvent(
          {
            ...(value || {}),
            propertiesHasOptions: this.propertiesHasOptions(value, keyRecords),
          },
          true,
        ),
      );
  };

  getKeyIds = () => {
    const { properties, excludeList } = this.props;
    const recordsPath = Object.values(properties)
      .map(({ keyId }) => keyId)
      .join(',');
    const params = excludeList
      ? `excludeList=${JSON.stringify(excludeList)}`
      : false;
    const path = `${recordsPath}${params ? `,${params}` : ''}`;
    return path;
  };

  getOptions = (propertyName, value = {}, keyRecords) => {
    const { properties, records } = this.props;
    let options = keyRecords || records[this.getKeyIds()];

    if (!options || !Array.isArray(options)) {
      return undefined;
    }

    const property = properties[propertyName];
    options = options.filter(({ keyId }) => keyId === property.keyId);

    const propertyIndex = Object.keys(properties).indexOf(propertyName);

    if (propertyIndex) {
      const parentPropertyName = Object.keys(properties)[propertyIndex - 1];
      const parentValues = [].concat(value[parentPropertyName]).filter(Boolean);
      const parentRelationIds = parentValues.map(
        ({ isRelationId }) => isRelationId,
      );
      options = options.filter(({ isRelationLink }) =>
        parentRelationIds.includes(isRelationLink),
      );
    }

    return (
      options &&
      options
        .sort((a, b) => a.stringified.localeCompare(b.stringified))
        .map(toOption)
    );
  };

  getValue = (propertyName) => {
    const { value } = this.props;
    return (value || {})[propertyName];
  };

  hasParentValue = (propertyName, value) => {
    const { properties } = this.props;
    const propertyIndex = Object.keys(properties).indexOf(propertyName);

    if (!propertyIndex) {
      return true;
    }

    const parentPropertyName = Object.keys(properties)[propertyIndex - 1];
    return [].concat(value[parentPropertyName]).filter(Boolean).length > 0;
  };

  handleChange = (propertyName) => (value) => {
    const { value: oldValue, onChange, properties } = this.props;
    const propertyNames = Object.keys(properties);
    const propertyIndex = propertyNames.indexOf(propertyName);

    const newValue = { ...(oldValue || {}), [propertyName]: value };
    propertyNames
      .filter((child, index) => index > propertyIndex)
      .forEach((child) => {
        const childPropertyIndex = propertyNames.indexOf(child);
        const parentPropertyName = propertyNames[childPropertyIndex - 1];
        const parentPropertyValues = []
          .concat(newValue[parentPropertyName])
          .filter(Boolean);
        const parentRelationIds = parentPropertyValues.map(
          ({ isRelationId }) => isRelationId,
        );

        const childValue = []
          .concat(newValue[child])
          .filter(Boolean)
          .filter(({ isRelationLink }) =>
            parentRelationIds.includes(isRelationLink),
          );

        const { multiple: childMultiple } = properties[child];
        newValue[child] = childMultiple ? childValue : childValue.shift();
      });

    const val = {
      ...newValue,
      propertiesHasOptions: this.propertiesHasOptions(newValue),
    };

    onChange && onChange(new ChangeEvent(val, true));
  };

  propertiesHasOptions = (newValue, keyRecords) => {
    const { properties } = this.props;

    return Object.keys(properties).reduce((acc, propertyName) => {
      const options = this.getOptions(propertyName, newValue, keyRecords);
      return {
        ...acc,
        [propertyName]: !!(
          this.hasParentValue(propertyName, newValue) &&
          options &&
          options.length
        ),
      };
    }, {});
  };

  isDisabledProperty = (isDisabled) => {
    const { value, rootDocument, steps, activeStep, parentValue } = this.props;

    if (!isDisabled) return false;

    if (typeof isDisabled === 'boolean') return isDisabled;

    const isDisabledEval = evaluate(
      isDisabled,
      value,
      rootDocument.data[steps[activeStep]],
      rootDocument.data,
      parentValue,
    );

    if (isDisabledEval instanceof Error) return false;

    return isDisabledEval;
  };

  isHiddenProperty = (hidden) => {
    const { value, rootDocument, parentValue, userInfo } = this.props;

    if (!hidden) return false;

    if (typeof hidden === 'boolean') return hidden;

    const isHiddenEval = evaluate(
      hidden,
      rootDocument.data,
      value,
      parentValue,
      userInfo,
    );

    if (isHiddenEval instanceof Error) return false;

    return isHiddenEval;
  };

  renderProperty = (propertyName) => {
    const {
      properties,
      schema,
      errors,
      path,
      value,
      noMargin,
      readOnly,
      useOwnContainer,
      renderEmptyProperties,
      active,
    } = this.props;

    const options = this.getOptions(propertyName, value || {});

    const error = errors.find(
      (err) => err.path === path.concat(propertyName).join('.'),
    );

    if (
      !renderEmptyProperties &&
      (!this.hasParentValue(propertyName, value || {}) ||
        (options && !options.length))
    ) {
      return null;
    }

    const { multiple, description, autoFocus, isDisabled, hidden, ...props } =
      properties[propertyName];

    if (this.isHiddenProperty(hidden)) {
      return null;
    }

    return (
      <ElementContainer
        {...props}
        key={propertyName}
        bottomSample={true}
        error={error}
        noMargin={noMargin}
        required={
          Array.isArray(schema.required) &&
          schema.required.includes(propertyName)
        }
      >
        <Select
          id={path.concat(propertyName).join('-')}
          autoFocus={autoFocus}
          value={toOption(this.getValue(propertyName))}
          description={description}
          error={!!error}
          multiple={!!multiple}
          onChange={this.handleChange(propertyName)}
          options={options}
          readOnly={readOnly || !active || this.isDisabledProperty(isDisabled)}
          useOwnContainer={useOwnContainer}
        />
      </ElementContainer>
    );
  };

  render() {
    const {
      triggerExternalPath,
      externalReaderMessage,
      stepName,
      description,
      sample,
      error,
      required,
      properties,
      outlined,
      hidden,
      width,
      maxWidth,
      path,
      typography,
      ...rest
    } = this.props;

    if (hidden) return null;

    return (
      <ElementGroupContainer
        variant={typography}
        outlined={outlined}
        error={error}
        sample={sample}
        required={required}
        description={description}
        width={width}
        maxWidth={maxWidth}
        path={path}
        useOwnContainer={false}
        noMargin={true}
        {...rest}
      >
        {Object.keys(properties).map(this.renderProperty)}
        {equilPath(triggerExternalPath, [stepName].concat(path))
          ? externalReaderMessage
          : null}
      </ElementGroupContainer>
    );
  }
}

RelatedKeyRegister.propTypes = {
  demo: PropTypes.bool,
  records: PropTypes.object,
  actions: PropTypes.object.isRequired,
  properties: PropTypes.object,
  description: PropTypes.string,
  sample: PropTypes.string,
  outlined: PropTypes.bool,
  value: PropTypes.object,
  errors: PropTypes.array,
  error: PropTypes.object,
  onChange: PropTypes.func,
  required: PropTypes.bool,
  path: PropTypes.array,
  schema: PropTypes.object,
  readOnly: PropTypes.bool,
  renderEmptyProperties: PropTypes.bool,
  excludeList: PropTypes.object,
  active: PropTypes.bool,
  useOwnContainer: PropTypes.bool,
  typography: PropTypes.string,
};

RelatedKeyRegister.defaultProps = {
  demo: false,
  properties: {},
  description: '',
  sample: '',
  value: {},
  records: {},
  errors: [],
  outlined: false,
  error: null,
  required: false,
  onChange: () => null,
  path: [],
  schema: {},
  readOnly: false,
  useOwnContainer: defaultProps.useOwnContainer,
  renderEmptyProperties: false,
  excludeList: null,
  active: true,
  typography: 'subtitle1',
};

const mapStateToPops = ({
  registry: { relatedRecords },
  auth: { info: userInfo },
}) => ({
  records: relatedRecords,
  userInfo,
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestRegisterRelatedKeyRecords: bindActionCreators(
      requestRegisterRelatedKeyRecords,
      dispatch,
    ),
  },
});

export default connect(mapStateToPops, mapDispatchToProps)(RelatedKeyRegister);
