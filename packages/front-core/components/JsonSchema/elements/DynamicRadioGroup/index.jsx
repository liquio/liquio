import React from 'react';
import PropTypes from 'prop-types';
import objectPath from 'object-path';
import ElementGroupContainer from 'components/JsonSchema/components/ElementGroupContainer';
import RadioButtons from 'components/JsonSchema/elements/DynamicRadioGroup/components/RadioButtons';
import ChangeEvent from 'components/JsonSchema/ChangeEvent';
import evaluate from 'helpers/evaluate';
import renderHTML from 'helpers/renderHTML';
import Handlebars from 'components/JsonSchema/helpers/handlebarsHelpers';
import withStyles from '@mui/styles/withStyles';
import styles from 'components/JsonSchema/elements/RadioGroup/components/layout';

class DynamicRadioGroup extends React.Component {
  handleChange = (value) => () => {
    const { onChange } = this.props;
    onChange(new ChangeEvent(value, true, false));
  };

  removeUnExistedValues = (valueName, list) => {
    const { onChange } = this.props;

    if (!list || !valueName || !Object.keys(valueName || {}).length) return;

    const exist = list.map(({ id }) => id).includes(valueName.id);

    if (!exist) onChange(null);
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

  getLabel = (key) => {
    const { labelKeys } = this.props;

    if (key.displayName) return key.displayName;

    if (labelKeys) {
      return (labelKeys || []).map((el) => el && key[el] && key[el]).join(' ');
    }

    return this.renderTitle(key);
  };

  isDisabled = (item) => {
    if (!item) return false;

    const { rootDocument, steps, activeStep, isDisabled } = this.props;

    if (isDisabled && typeof isDisabled === 'string') {
      const result = evaluate(
        isDisabled,
        item,
        rootDocument.data[steps[activeStep]],
        rootDocument.data,
      );

      if (result instanceof Error) {
        result.commit({ type: 'radio group check disabled' });
        return false;
      }
      return result;
    }
    return isDisabled === false;
  };

  uniq = (array) => {
    if (!array) return [];
    const addId = array.map((item, index) => ({
      ...item,
      id:
        item?.id ||
        this.renderTitle(item).split(' ').join(`_${index}`).toLowerCase(),
      isDisabled: this.isDisabled(item),
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

    const evaluatePath = evaluate(dataPath, rootDocument.data);

    if (evaluatePath instanceof Error) return path;

    return evaluatePath;
  };

  getControlData = () => {
    const { rootDocument, dataMapping, documents, isPopup } = this.props;
    const document = isPopup ? documents?.rootDocument : rootDocument;

    const data = this.uniq(objectPath.get(document.data, this.getDataPath()));

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
    const { sample: sampleOrigin, params, rootDocument, schema } = this.props;

    const sample = sampleOrigin || schema?.sample;

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

  renderElement() {
    const { value, readOnly, locked, fontSize } = this.props;

    const list = this.getControlData();

    this.removeUnExistedValues(value, list);

    return (
      <RadioButtons
        {...this.props}
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

    return (
      <ElementGroupContainer
        description={description}
        required={required}
        error={error}
        noMargin={noMargin}
        variant={typography}
        path={path}
        descriptionClassName={classes.groupDescription}
      >
        {this.renderElement()}
      </ElementGroupContainer>
    );
  }
}

DynamicRadioGroup.propTypes = {
  rowDirection: PropTypes.bool,
  value: PropTypes.string,
  onChange: PropTypes.func,
  error: PropTypes.object,
  description: PropTypes.string,
  required: PropTypes.bool,
  type: PropTypes.string,
  path: PropTypes.array,
  dataPath: PropTypes.string.isRequired,
  rootDocument: PropTypes.object.isRequired,
  hidden: PropTypes.bool,
  labelKeys: PropTypes.array,
  noMargin: PropTypes.bool,
  locked: PropTypes.bool,
  typography: PropTypes.string,
};

DynamicRadioGroup.defaultProps = {
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

export default withStyles(styles)(DynamicRadioGroup);
