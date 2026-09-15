import React from 'react';
import objectPath from 'object-path';
import ElementGroupContainer from 'components/JsonSchema/components/ElementGroupContainer';
import RadioButtons from 'components/JsonSchema/elements/DynamicRadioGroup/components/RadioButtons';
import ChangeEvent from 'components/JsonSchema/ChangeEvent';
import EvaluateError from 'helpers/evaluate/EvaluateError';
import evaluate from 'helpers/evaluate';
import renderHTML from 'helpers/renderHTML';
import Handlebars from 'components/JsonSchema/helpers/handlebarsHelpers';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import styles from 'components/JsonSchema/elements/RadioGroup/components/layout';
import { JsonSchemaNode, RootDocument } from '../../types';

interface RadioItem {
  id: string | number;
  isDisabled?: boolean;
  displayName?: string;
  [key: string]: unknown;
}

interface DynamicRadioGroupProps extends WithStyles<typeof styles> {
  rowDirection?: boolean;
  value?: { id?: string | number } | string;
  onChange: ((event: InstanceType<typeof ChangeEvent> | null) => void) | null;
  error?: unknown;
  description?: string | null;
  required?: boolean;
  type?: string | null;
  path: Array<string | number>;
  dataPath: string;
  rootDocument: RootDocument;
  hidden?: boolean;
  labelKeys?: string[] | null;
  noMargin?: boolean;
  locked?: boolean;
  typography?: string;
  steps?: string[];
  activeStep?: number;
  isDisabled?: string | boolean;
  dataMapping?: string;
  documents?: { rootDocument?: RootDocument };
  isPopup?: boolean;
  pathIndex?: { index?: string | number };
  params?: Record<string, { path: string; transformVal: string } | string> | null;
  sample?: string | null;
  schema?: JsonSchemaNode;
  readOnly?: boolean;
  fontSize?: string | number;
}

class DynamicRadioGroup extends React.Component<DynamicRadioGroupProps> {
  static defaultProps = {
    rowDirection: false,
    value: '',
    onChange: null,
    error: null,
    description: null,
    required: false,
    type: null,
    path: [],
    hidden: false,
    labelKeys: null,
    noMargin: false,
    locked: false,
    typography: 'subtitle1',
  };

  handleChange = (value: RadioItem) => () => {
    const { onChange } = this.props;
    onChange?.(new ChangeEvent(value, true, false) as InstanceType<typeof ChangeEvent>);
  };

  removeUnExistedValues = (valueName: { id?: string | number } | string, list: RadioItem[]) => {
    const { onChange } = this.props;

    if (!list || !valueName || !Object.keys(valueName || {}).length) return;

    const exist = list.map(({ id }) => id).includes((valueName as { id?: string | number }).id as string | number);

    if (!exist) onChange?.(null);
  };

  renderTitle = (obj: Record<string, unknown> | null | undefined): string => {
    if (!obj) return '';

    let string = '';

    Object.keys(obj).forEach((item) => {
      if (item === 'id') return;
      string += ' ' + obj[item];
    });

    return string;
  };

  getLabel = (key: RadioItem): React.ReactNode => {
    const { labelKeys } = this.props;

    if (key.displayName) return key.displayName;

    if (labelKeys) {
      return (labelKeys || []).map((el) => el && key[el] && key[el]).join(' ');
    }

    return this.renderTitle(key);
  };

  isDisabled = (item: RadioItem): unknown => {
    if (!item) return false;

    const { rootDocument, steps, activeStep, isDisabled } = this.props;

    if (isDisabled && typeof isDisabled === 'string') {
      const result = evaluate(
        isDisabled,
        item,
        rootDocument.data[(steps as string[])[activeStep as number]],
        rootDocument.data,
      );

      if (result instanceof Error) {
        (result as EvaluateError).commit({ type: 'radio group check disabled' });
        return false;
      }
      return result;
    }
    return isDisabled === false;
  };

  uniq = (array: RadioItem[] | null | undefined): RadioItem[] => {
    if (!array) return [];
    const addId = array.map((item, index) => ({
      ...item,
      id:
        item?.id ||
        this.renderTitle(item).split(' ').join(`_${index}`).toLowerCase(),
      isDisabled: this.isDisabled(item) as boolean,
    }));

    const seen: Record<string, boolean> = {};

    return addId.filter((item) => {
      if (Object.prototype.hasOwnProperty.call(seen, item.id)) return false;
      seen[item.id] = true;
      return true;
    });
  };

  getDataPath = (): string => {
    const { dataPath, rootDocument, pathIndex } = this.props;
    let path = dataPath;
    const indexPattern = /\${index}/;
    if (indexPattern.test(dataPath)) {
      path = path.replace(indexPattern, String(pathIndex?.index));
    }

    const evaluatePath = evaluate(dataPath, rootDocument.data);

    if (evaluatePath instanceof Error) return path;

    return evaluatePath as string;
  };

  getControlData = (): RadioItem[] => {
    const { rootDocument, dataMapping, documents, isPopup } = this.props;
    const document = isPopup ? (documents?.rootDocument as RootDocument) : rootDocument;

    const data = this.uniq(objectPath.get(document.data, this.getDataPath()) as RadioItem[]);

    if (!dataMapping) return data;

    const mappedData = (evaluate(dataMapping, data) as RadioItem[]) || [];

    if (mappedData instanceof Error) return [];

    return this.uniq(mappedData) || [];
  };

  transformValue = ({ dataObject, param }: { dataObject: Record<string, unknown>; param: string }): string => {
    const { params } = this.props;
    const { path, transformVal } = params?.[param] as { path: string; transformVal: string };
    const data = objectPath.get(dataObject, path);
    const transforming = evaluate(transformVal, data) || '';
    return transforming instanceof Error ? '' : (transforming as string);
  };

  getSample = (item: RadioItem): React.ReactNode => {
    const { sample: sampleOrigin, params, rootDocument, schema } = this.props;

    const sample = sampleOrigin || schema?.sample;

    if (!sample || typeof sample !== 'string') return null;

    if (params) {
      const template = Handlebars.compile(sample);
      const templateData = Object.keys(params).reduce((acc, param) => {
        const dataObject = { ...rootDocument.data, ...item };
        const value =
          typeof params[param] === 'object'
            ? this.transformValue({ dataObject, param })
            : objectPath.get(dataObject, params[param] as string);

        return {
          ...acc,
          [param]: value,
        };
      }, {});

      return renderHTML((template(templateData) || null) as string) as React.ReactNode;
    }
    return null;
  };

  renderElement() {
    const { value, readOnly, locked, fontSize } = this.props;

    const list = this.getControlData();

    this.removeUnExistedValues(value as { id?: string | number } | string, list);

    return (
      <RadioButtons
        {...this.props}
        value={value as { id?: string | number }}
        readOnly={readOnly || locked}
        list={list}
        getLabel={this.getLabel}
        onChange={this.handleChange}
        getSample={this.getSample}
        fontSize={fontSize}
      />
    );
  }

  render() {
    const {
      classes,
      description,
      required,
      error,
      hidden,
      noMargin,
      path,
      typography,
    } = this.props;

    if (hidden) return null;

    // `classes.groupDescription` is never defined in `layout.js` — always a no-op. Preserved as-is.
    return (
      <ElementGroupContainer
        description={description as string}
        required={required}
        error={error}
        noMargin={noMargin}
        variant={typography as 'subtitle1'}
        path={path}
        descriptionClassName={(classes as Record<string, string>).groupDescription}
      >
        {this.renderElement()}
      </ElementGroupContainer>
    );
  }
}

export default withStyles(styles)(DynamicRadioGroup);
