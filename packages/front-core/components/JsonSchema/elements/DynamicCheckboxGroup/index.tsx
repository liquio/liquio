import React from 'react';
import objectPath from 'object-path';
import Handlebars from 'components/JsonSchema/helpers/handlebarsHelpers';
import moment from 'moment';
import evaluate from 'helpers/evaluate';
import renderHTML from 'helpers/renderHTML';
import CheckboxLayout from 'components/JsonSchema/elements/DynamicCheckboxGroup/components/CheckboxLayout';

interface CheckboxItem {
  id: string | number;
  displayName?: string;
  [key: string]: unknown;
}

// Joins the arrays directly (not their ids) — every object stringifies to
// "[object Object]", so this only ever compares *lengths* in practice, not
// contents. A pre-existing bug in `removeUnexistedValues` below. Preserved as-is.
const compareArrays = (arr1: unknown[], arr2: unknown[]): boolean =>
  arr1.join('') === arr2.join('');

interface DynamicCheckboxGroupProps {
  rowDirection?: boolean;
  params?: Record<string, { path: string; transformVal: string } | string> | null;
  hidden?: boolean;
  value?: CheckboxItem[];
  onChange?: ((value: CheckboxItem[]) => void) | null;
  sample?: string | string[];
  error?: unknown;
  description?: string | null;
  required?: boolean;
  readOnly?: boolean;
  defaultValue?: CheckboxItem[] | null;
  path?: Array<string | number>;
  dataPath: string;
  rootDocument: { data: Record<string, unknown> };
  labelKeys?: string[] | null;
  dataMapping?: string | null;
  fontSize?: number;
  pathIndex?: { index?: string | number };
  isPopup?: boolean;
  documents?: { rootDocument?: { data: Record<string, unknown> } };
  noMargin?: boolean;
}

class DynamicCheckboxGroup extends React.Component<DynamicCheckboxGroupProps> {
  static defaultProps = {
    rowDirection: false,
    params: null,
    hidden: false,
    value: [],
    onChange: null,
    sample: [],
    error: null,
    description: null,
    required: false,
    readOnly: false,
    defaultValue: null,
    path: [],
    labelKeys: null,
    dataMapping: null,
    fontSize: 20,
  };

  handleChange = async (checkedKeys: CheckboxItem[], key: CheckboxItem, keyId: string | number) => {
    const { onChange } = this.props;

    onChange?.(
      checkedKeys.find(({ id }) => id === keyId)
        ? checkedKeys.filter(({ id }) => id !== keyId)
        : checkedKeys.concat([
            {
              ...key,
            },
          ]),
    );
  };

  removeUnexistedValues = (checkedKeys: CheckboxItem[], list: CheckboxItem[]) => {
    const { onChange } = this.props;

    const exist: CheckboxItem[] = [];

    checkedKeys.forEach((item) => {
      list.forEach((listItem) => {
        if (item.id === listItem.id) exist.push(item);
      });
    });

    if (compareArrays(exist, checkedKeys)) return;

    onChange?.(exist);
  };

  getLabel = (key: CheckboxItem): React.ReactNode => {
    const { labelKeys } = this.props;

    if (key.displayName) return key.displayName;

    if (labelKeys) {
      return (labelKeys || []).map((el) => el && key[el] && key[el]).join(' ');
    }

    return this.renderTitle(key);
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

  uniq = (array: CheckboxItem[] | null | undefined): CheckboxItem[] => {
    const { hidden } = this.props;

    if (!array) return [];
    if (hidden) return [];

    const addId = array.map((item, index) => ({
      ...item,
      id: this.renderTitle(item).split(' ').join(`_${index}`).toLowerCase(),
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

    const evalatePath = evaluate(dataPath, rootDocument.data);

    if (evalatePath instanceof Error) return path;

    return evalatePath as string;
  };

  getControlData = (): CheckboxItem[] => {
    const { rootDocument, dataMapping, isPopup, documents } = this.props;

    const data = this.uniq(
      objectPath.get(
        isPopup ? documents?.rootDocument?.data : rootDocument.data,
        this.getDataPath(),
      ) as CheckboxItem[],
    );

    if (!dataMapping) return data;

    const mappedData =
      (evaluate(
        dataMapping,
        data,
        isPopup ? documents?.rootDocument?.data : rootDocument.data,
      ) as CheckboxItem[]) || [];

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

  getSample = (item: CheckboxItem): React.ReactNode => {
    const { sample, params, rootDocument } = this.props;

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

  componentDidMount = () => {
    const { value, onChange, required, defaultValue } = this.props;

    if (defaultValue && value === null) {
      onChange?.(defaultValue);
    } else if (required && !Array.isArray(value)) {
      onChange?.([]);
    }
    (window as unknown as { moment: typeof moment }).moment = moment;
  };

  render() {
    const {
      description,
      required,
      value,
      readOnly,
      rowDirection,
      error,
      path,
      hidden,
      noMargin,
      fontSize = 20,
    } = this.props;

    const checkedKeys = value || [];

    const list = this.getControlData();

    const size = fontSize > 25 || fontSize < 14 ? 20 : fontSize;

    this.removeUnexistedValues(checkedKeys, list);

    if (hidden) return null;

    return (
      <CheckboxLayout
        list={list}
        path={path}
        description={description}
        required={required}
        error={error}
        noMargin={noMargin}
        checkedKeys={checkedKeys}
        readOnly={readOnly}
        rowDirection={rowDirection}
        onChange={this.handleChange}
        getLabel={this.getLabel}
        getSample={this.getSample}
        fontSize={size}
      />
    );
  }
}

export default DynamicCheckboxGroup;
