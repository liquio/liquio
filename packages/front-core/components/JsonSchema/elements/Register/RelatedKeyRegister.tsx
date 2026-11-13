import React from 'react';

import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import { ChangeEvent } from 'components/JsonSchema';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import ElementGroupContainer from 'components/JsonSchema/components/ElementGroupContainer';

import Select from 'components/Select';

import * as registryActions from 'application/actions/registry';
import processList from 'services/processList';
import equilPath from 'helpers/equilPath';
import defaultProps from 'components/JsonSchema/elements/Register/defaultProps';
import evaluate from 'helpers/evaluate';

// requestRegisterRelatedKeyRecords is only exported by cabinet-front's application/actions/registry;
// admin-front's copy lacks it, so it is resolved dynamically to keep this file shared between both apps.
const requestRegisterRelatedKeyRecords = (registryActions as unknown as Record<string, (...args: unknown[]) => (dispatch: Dispatch) => Promise<unknown>>).requestRegisterRelatedKeyRecords;

interface RegisterRecord {
  keyId?: number | string;
  isRelationId?: unknown;
  isRelationLink?: unknown;
  stringified?: string;
  id?: string | number;
  [key: string]: unknown;
}

interface RelatedKeyProperty {
  keyId?: number | string;
  multiple?: boolean;
  description?: string;
  autoFocus?: boolean;
  isDisabled?: boolean | string;
  hidden?: boolean | string;
  [key: string]: unknown;
}

const toOption = (option?: RegisterRecord | null) =>
  option && {
    ...option,
    label: option && option.stringified,
    value: option && option.id,
  };

interface RelatedKeyRegisterProps {
  demo?: boolean;
  records: Record<string, RegisterRecord[] | Error>;
  actions: {
    requestRegisterRelatedKeyRecords: (...args: unknown[]) => unknown;
  };
  properties: Record<string, RelatedKeyProperty>;
  description?: string;
  sample?: string;
  outlined?: boolean;
  value?: Record<string, unknown> & { propertiesHasOptions?: Record<string, boolean> };
  errors: Array<{ path: string; [key: string]: unknown }>;
  error?: unknown;
  onChange?: (event: unknown) => void;
  required?: boolean;
  path: Array<string | number>;
  schema: { required?: string[]; [key: string]: unknown };
  readOnly?: boolean;
  renderEmptyProperties?: boolean;
  excludeList?: unknown;
  active?: boolean;
  useOwnContainer?: boolean;
  typography?: string;
  cleanWhenHidden?: boolean;
  hidden?: boolean;
  originDocument?: { isFinal?: boolean };
  rootDocument: { data: Record<string, unknown> };
  steps: string[];
  activeStep: number;
  parentValue?: unknown;
  userInfo?: unknown;
  noMargin?: boolean;
  width?: number | string;
  maxWidth?: number | string;
  triggerExternalPath?: Array<string | number>;
  externalReaderMessage?: React.ReactNode;
  stepName?: string;
}

class RelatedKeyRegister extends React.Component<RelatedKeyRegisterProps> {
  static defaultProps = {
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
            propertiesHasOptions: this.propertiesHasOptions(value, keyRecords as RegisterRecord[]),
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

  getOptions = (propertyName: string, value: Record<string, unknown> = {}, keyRecords?: RegisterRecord[]) => {
    const { properties, records } = this.props;
    let options: RegisterRecord[] | undefined = keyRecords || (records[this.getKeyIds()] as RegisterRecord[]);

    if (!options || !Array.isArray(options)) {
      return undefined;
    }

    const property = properties[propertyName];
    options = options.filter(({ keyId }) => keyId === property.keyId);

    const propertyIndex = Object.keys(properties).indexOf(propertyName);

    if (propertyIndex) {
      const parentPropertyName = Object.keys(properties)[propertyIndex - 1];
      const parentValues = ([] as unknown[]).concat(value[parentPropertyName] as never).filter(Boolean) as RegisterRecord[];
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
        .sort((a, b) => (a.stringified || '').localeCompare(b.stringified || ''))
        .map(toOption)
    );
  };

  getValue = (propertyName: string) => {
    const { value } = this.props;
    return (value || {})[propertyName];
  };

  hasParentValue = (propertyName: string, value: Record<string, unknown>) => {
    const { properties } = this.props;
    const propertyIndex = Object.keys(properties).indexOf(propertyName);

    if (!propertyIndex) {
      return true;
    }

    const parentPropertyName = Object.keys(properties)[propertyIndex - 1];
    return ([] as unknown[]).concat(value[parentPropertyName] as never).filter(Boolean).length > 0;
  };

  handleChange = (propertyName: string) => (value: unknown) => {
    const { value: oldValue, onChange, properties } = this.props;
    const propertyNames = Object.keys(properties);
    const propertyIndex = propertyNames.indexOf(propertyName);

    const newValue: Record<string, unknown> = { ...(oldValue || {}), [propertyName]: value };
    propertyNames
      .filter((child, index) => index > propertyIndex)
      .forEach((child) => {
        const childPropertyIndex = propertyNames.indexOf(child);
        const parentPropertyName = propertyNames[childPropertyIndex - 1];
        const parentPropertyValues = ([] as unknown[])
          .concat(newValue[parentPropertyName] as never)
          .filter(Boolean) as RegisterRecord[];
        const parentRelationIds = parentPropertyValues.map(
          ({ isRelationId }) => isRelationId,
        );

        const childValue = (([] as unknown[])
          .concat(newValue[child] as never)
          .filter(Boolean) as RegisterRecord[])
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

  propertiesHasOptions = (newValue: Record<string, unknown>, keyRecords?: RegisterRecord[]) => {
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
    }, {} as Record<string, boolean>);
  };

  isDisabledProperty = (isDisabled?: boolean | string) => {
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

  isHiddenProperty = (hidden?: boolean | string) => {
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

  renderProperty = (propertyName: string) => {
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
        {...(props as unknown as Record<string, unknown>)}
        key={propertyName}
        bottomSample={true}
        error={error as never}
        noMargin={noMargin}
        required={
          Array.isArray(schema.required) &&
          schema.required.includes(propertyName)
        }
      >
        <Select
          id={path.concat(propertyName).join('-')}
          autoFocus={autoFocus}
          value={toOption(this.getValue(propertyName) as RegisterRecord)}
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
        variant={typography as never}
        outlined={outlined}
        error={error as never}
        sample={sample}
        required={required}
        description={description}
        width={width as never}
        maxWidth={maxWidth as never}
        path={path as never}
        useOwnContainer={false}
        noMargin={true}
        {...(rest as unknown as Record<string, unknown>)}
      >
        {Object.keys(properties).map(this.renderProperty)}
        {equilPath(triggerExternalPath, ([stepName] as Array<string | number | undefined>).concat(path))
          ? externalReaderMessage
          : null}
      </ElementGroupContainer>
    );
  }
}

const mapStateToPops = ({
  registry: { relatedRecords },
  auth: { info: userInfo },
}: { registry: { relatedRecords: Record<string, RegisterRecord[]> }; auth: { info: unknown } }) => ({
  records: relatedRecords,
  userInfo,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    requestRegisterRelatedKeyRecords: bindActionCreators(
      requestRegisterRelatedKeyRecords as never,
      dispatch as never,
    ),
  },
});

export default connect(mapStateToPops, mapDispatchToProps)(RelatedKeyRegister as never);
