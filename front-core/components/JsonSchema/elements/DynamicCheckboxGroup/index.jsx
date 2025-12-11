import React from 'react';
import PropTypes from 'prop-types';
import objectPath from 'object-path';
import Handlebars from 'components/JsonSchema/helpers/handlebarsHelpers';
import moment from 'moment';
import evaluate from 'helpers/evaluate';
import renderHTML from 'helpers/renderHTML';
import CheckboxLayout from 'components/JsonSchema/elements/DynamicCheckboxGroup/components/CheckboxLayout';

const compareArrays = (arr1, arr2) => arr1.join('') === arr2.join('');

class DynamicCheckboxGroup extends React.Component {
  handleChange = async (checkedKeys, key, keyId) => {
    const { onChange } = this.props;

    onChange(
      checkedKeys.find(({ id }) => id === keyId)
        ? checkedKeys.filter(({ id }) => id !== keyId)
        : checkedKeys.concat([
            {
              ...key,
            },
          ]),
    );
  };

  removeUnexistedValues = (checkedKeys, list) => {
    const { onChange } = this.props;

    const exist = [];

    checkedKeys.forEach((item) => {
      list.forEach((listItem) => {
        if (item.id === listItem.id) exist.push(item);
      });
    });

    if (compareArrays(exist, checkedKeys)) return;

    onChange(exist);
  };

  getLabel = (key) => {
    const { labelKeys } = this.props;

    if (key.displayName) return key.displayName;

    if (labelKeys) {
      return (labelKeys || []).map((el) => el && key[el] && key[el]).join(' ');
    }

    return this.renderTitle(key);
  };

  renderTitle = (obj) => {
    if (!obj) return '';

    let string = '';

    Object.keys(obj).forEach((item) => {
      if (item === 'id') return;
      string += ' ' + obj[item];
    });

    return string;
  };

  uniq = (array) => {
    if (!array) return [];

    const addId = array.map((item, index) => ({
      ...item,
      id: this.renderTitle(item).split(' ').join(`_${index}`).toLowerCase(),
    }));

    const seen = {};

    return addId.filter((item) => {
      if (seen.hasOwnProperty(item.id)) return null;
      seen[item.id] = true;
      return item;
    });
  };

  getDataPath = () => {
    const { dataPath, rootDocument, pathIndex } = this.props;
    let path = dataPath;
    const indexPattern = /\${index}/;
    if (indexPattern.test(dataPath)) {
      path = path.replace(indexPattern, pathIndex?.index);
    }

    const evalatePath = evaluate(dataPath, rootDocument.data);

    if (evalatePath instanceof Error) return path;

    return evalatePath;
  };

  getControlData = () => {
    const { rootDocument, dataMapping, isPopup, documents } = this.props;

    const data = this.uniq(
      objectPath.get(
        isPopup ? documents?.rootDocument?.data : rootDocument.data,
        this.getDataPath(),
      ),
    );

    if (!dataMapping) return data;

    const mappedData = evaluate(dataMapping, data) || [];

    if (mappedData instanceof Error) return [];

    return this.uniq(mappedData) || [];
  };

  transformValue = ({ dataObject, param }) => {
    const { params } = this.props;
    const { path, transformVal } = params[param];
    const data = objectPath.get(dataObject, path);
    const transforming = evaluate(transformVal, data) || '';

    return transforming instanceof Error ? '' : transforming;
  };

  getSample = (item) => {
    const { sample, params, rootDocument } = this.props;

    if (!sample || typeof sample !== 'string') return null;

    if (params) {
      const template = Handlebars.compile(sample);
      const templateData = Object.keys(params).reduce((acc, param) => {
        const dataObject = { ...rootDocument.data, ...item };
        const value =
          typeof params[param] === 'object'
            ? this.transformValue({ dataObject, param, item })
            : objectPath.get(dataObject, params[param]);

        return {
          ...acc,
          [param]: value,
        };
      }, {});

      return renderHTML(template(templateData) || null);
    }
  };

  componentDidMount = () => {
    const { value, onChange, required, defaultValue } = this.props;

    if (defaultValue && value === null) {
      onChange && onChange(defaultValue);
    } else if (required && !Array.isArray(value)) {
      onChange && onChange([]);
    }
    window.moment = moment;
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
      fontSize,
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

DynamicCheckboxGroup.propTypes = {
  rowDirection: PropTypes.bool,
  params: PropTypes.object,
  hidden: PropTypes.bool,
  value: PropTypes.array,
  onChange: PropTypes.func,
  sample: PropTypes.array,
  error: PropTypes.object,
  description: PropTypes.string,
  required: PropTypes.array,
  readOnly: PropTypes.array,
  defaultValue: PropTypes.string,
  path: PropTypes.array,
  dataPath: PropTypes.string.isRequired,
  rootDocument: PropTypes.object.isRequired,
  labelKeys: PropTypes.array,
  dataMapping: PropTypes.string,
  fontSize: PropTypes.number,
};

DynamicCheckboxGroup.defaultProps = {
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

export default DynamicCheckboxGroup;
