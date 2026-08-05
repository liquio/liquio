/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import evaluate from 'helpers/evaluate';
import objectPath from 'object-path';

import emptyValues from 'components/JsonSchema/emptyValues';
import ChangeEvent from 'components/JsonSchema/ChangeEvent';

import ArrayElementContainer from 'components/JsonSchema/elements/ArrayElement/components/ArrayElementContainer';
import ArrayElementItem from 'components/JsonSchema/elements/ArrayElement/components/ArrayElementItem';
import ArrayElementAddBtn from 'components/JsonSchema/elements/ArrayElement/components/ArrayElementAddBtn';

class ArrayElement extends React.Component {
  componentDidMount() {
    this.init();
  }

  init = () => {
    const { onChange, allowEmpty, originDocument, stepName, path, hidden } =
      this.props;

    if (hidden) return null;

    const originValue = objectPath.get(
      originDocument?.data,
      [stepName].concat(path),
    );

    if (!originValue && !allowEmpty) {
      onChange && onChange(this.getItems());
    }
  };

  componentDidUpdate(prevProps) {
    const { hidden } = this.props;

    if (hidden !== prevProps.hidden) {
      this.init();
    }
  }

  handleAddItem = () => {
    const { onChange, items } = this.props;
    onChange &&
      onChange(
        this.getItems().concat([emptyValues[(items || {}).type || 'object']]),
      );
  };

  handleDeleteItem = (index) => () => {
    const { onChange, value, allowEmpty, items /*actions*/ } = this.props;
    const arr = Object.values(value);

    arr.splice(index, 1);

    if (!allowEmpty && !arr.length) {
      arr.push(emptyValues[items.type || 'object']);
    }

    onChange && onChange(new ChangeEvent(arr, false, true));
  };

  getItems = () => {
    const { value, items, allowEmpty } = this.props;
    const data = Object.values(value || {});
    return data.length || allowEmpty
      ? data
      : [].concat(emptyValues[(items || {}).type || 'object']);
  };

  allowAdd = () => {
    const { rootDocument, value, steps, activeStep, allowAdd } = this.props;

    if (allowAdd && typeof allowAdd === 'string') {
      const result = evaluate(
        allowAdd,
        value,
        rootDocument.data[steps[activeStep]],
        rootDocument.data,
      );

      if (result instanceof Error) {
        result.commit({ type: 'allowAdd check' });
        return true;
      }

      return result;
    }

    return allowAdd;
  };

  getStaticState = () => {
    const { staticState, rootDocument, value, steps, activeStep } = this.props;

    if (!staticState || typeof staticState !== 'string') {
      return staticState;
    }

    const result = evaluate(
      staticState,
      value,
      rootDocument.data[steps[activeStep]],
      rootDocument.data,
    );

    if (result instanceof Error) {
      console.error('staticState error', result);
      return undefined;
    }

    return result;
  };

  allowDelete = () => {
    const { rootDocument, value, steps, activeStep, allowDelete } = this.props;

    if (allowDelete && typeof allowDelete === 'string') {
      const result = evaluate(
        allowDelete,
        value,
        rootDocument.data[steps[activeStep]],
        rootDocument.data,
      );

      if (result instanceof Error) {
        result.commit({ type: 'allowDelete check' });
        return true;
      }

      return result;
    }

    return allowDelete;
  };

  renderElement = (values, index) => {
    const {
      task,
      taskId,
      customControls,
      steps,
      actions,
      rootDocument,
      originDocument,
      template,
      stepName,
      errors,
      path,
      allowEmpty,
      items = {},
      readOnly,
      onChange,
      active,
      locked,
      activeStep,
      clearWhenEmpty,
      disableBoxShadow,
      fileStorage,
      hideDeleteButton,
      darkTheme,
      handleSave,
      noBorder,
      isPopup,
      useOwnData,
      keyId,
      recordId,
      documents,
      border
    } = this.props;
    const arrayItems = this.getItems();
    return (
      <ArrayElementItem
        key={index}
        error={errors.find((err) => err.path === path.concat(index).join('.'))}
        path={path.concat(index)}
        deleteAllowed={
          this.allowDelete() &&
          !readOnly &&
          (allowEmpty || arrayItems.length > 1)
        }
        handleDeleteItem={this.handleDeleteItem(index)}
        disableBoxShadow={disableBoxShadow}
        staticState={this.getStaticState()}
        hideDeleteButton={hideDeleteButton}
        darkTheme={darkTheme}
        schemaProps={{
          active,
          locked,
          fileStorage,
          customControls,
          task,
          taskId,
          steps,
          rootDocument,
          originDocument,
          stepName,
          activeStep,
          actions,
          errors,
          template,
          pathIndex: {
            index,
          },
          path: path.concat(index),
          schema: {
            ...items,
            type: items.type || 'object',
            required: items.required || [],
            clearWhenEmpty,
            handleDeleteItem: this.handleDeleteItem(index),
          },
          name: index,
          value: values,
          readOnly: readOnly || items.readOnly,
          onChange: onChange?.bind(null, index) || (() => null),
          handleSave,
          allowDelete: this.allowDelete(),
          isPopup,
          useOwnData,
          keyId,
          recordId,
          parentSchema: items,
          documents
        }}
        noBorder={noBorder}
        border={border}
      />
    );
  };

  render() {
    const {
      t,
      locked,
      addItem,
      rootDocument,
      maxElements,
      hidden,
      readOnly,
      filterEmptyValues,
      ...rest
    } = this.props;

    if (hidden) {
      return null;
    }

    let arrayItems = this.getItems();
    let calcMaxElements = 0;

    if (maxElements) {
      calcMaxElements = maxElements;
      if (typeof maxElements === 'string') {
        calcMaxElements = evaluate(maxElements, rootDocument.data);

        if (calcMaxElements instanceof Error) {
          calcMaxElements.commit({ type: 'array element maxElements' });
          calcMaxElements = undefined;
        }
      }
    }

    const allowAdding =
      (!calcMaxElements || arrayItems.length < calcMaxElements) && !readOnly;

    if (filterEmptyValues) {
      arrayItems = arrayItems.filter((item) => Object.keys(item).length > 0);
    }

    return (
      <ArrayElementContainer handleAddItem={this.handleAddItem} {...rest}>
        {arrayItems.map(this.renderElement)}
        {this.allowAdd() && allowAdding && !this.getStaticState() ? (
          <ArrayElementAddBtn
            addItemText={(addItem && addItem.text) || t('AddArrayItem')}
            handleAddItem={this.handleAddItem}
            arrayItems={arrayItems}
            disabled={locked}
            noBorder={addItem && addItem.noBorder}
          />
        ) : null}
      </ArrayElementContainer>
    );
  }
}

ArrayElement.propTypes = {
  t: PropTypes.func.isRequired,
  errors: PropTypes.array,
  value: PropTypes.array,
  allowEmpty: PropTypes.bool,
  path: PropTypes.array,
  clearWhenEmpty: PropTypes.bool,
  staticState: PropTypes.bool,
  hideDeleteButton: PropTypes.bool,
  allowAdd: PropTypes.bool,
  allowDelete: PropTypes.bool,
  locked: PropTypes.bool,
  darkTheme: PropTypes.bool,
  filterEmptyValues: PropTypes.bool,
  noBorder: PropTypes.bool,
};

ArrayElement.defaultProps = {
  errors: [],
  value: [],
  allowEmpty: false,
  path: [],
  clearWhenEmpty: false,
  staticState: false,
  allowAdd: true,
  allowDelete: true,
  hideDeleteButton: false,
  locked: false,
  darkTheme: false,
  filterEmptyValues: false,
  noBorder: false,
};

export default translate('Elements')(ArrayElement);
