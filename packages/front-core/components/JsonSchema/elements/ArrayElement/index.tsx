/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { translate, Translate } from 'react-translate';
import evaluate from 'helpers/evaluate';
import objectPath from 'object-path';

import emptyValues from 'components/JsonSchema/emptyValues';
import ChangeEvent from 'components/JsonSchema/ChangeEvent';

import ArrayElementContainer from 'components/JsonSchema/elements/ArrayElement/components/ArrayElementContainer';
import ArrayElementItem from 'components/JsonSchema/elements/ArrayElement/components/ArrayElementItem';
import ArrayElementAddBtn from 'components/JsonSchema/elements/ArrayElement/components/ArrayElementAddBtn';
import { JsonSchemaNode } from '../../types';

interface ArrayElementProps {
  t: Translate;
  errors?: Array<{ path: string }>;
  value?: Record<string, unknown> | unknown[];
  allowEmpty?: boolean;
  path?: Array<string | number>;
  clearWhenEmpty?: boolean;
  staticState?: boolean | string;
  hideDeleteButton?: boolean;
  allowAdd?: boolean | string;
  allowDelete?: boolean | string;
  locked?: boolean;
  darkTheme?: boolean;
  filterEmptyValues?: boolean;
  noBorder?: boolean;
  onChange?: ((value: unknown) => void) | null;
  originDocument?: { data: Record<string, unknown> };
  stepName?: string;
  hidden?: boolean;
  items?: JsonSchemaNode & { type?: string; required?: string[]; readOnly?: boolean };
  rootDocument: { data: Record<string, unknown> };
  steps?: Array<string | number>;
  activeStep?: number;
  task?: unknown;
  taskId?: unknown;
  customControls?: unknown;
  actions?: unknown;
  template?: unknown;
  readOnly?: boolean;
  active?: unknown;
  clearWhenEmptyStatic?: unknown;
  disableBoxShadow?: boolean;
  fileStorage?: unknown;
  handleSave?: unknown;
  isPopup?: unknown;
  useOwnData?: unknown;
  keyId?: unknown;
  recordId?: unknown;
  documents?: unknown;
  border?: unknown;
  addItem?: { text?: string; noBorder?: boolean };
  maxElements?: number | string;
  [key: string]: unknown;
}

class ArrayElement extends React.Component<ArrayElementProps> {
  static defaultProps: Partial<ArrayElementProps> = {
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

  componentDidMount() {
    this.init();
  }

  init = () => {
    const { onChange, allowEmpty, originDocument, stepName, path, hidden } =
      this.props;

    if (hidden) return null;

    const originValue = objectPath.get(
      originDocument?.data,
      ([stepName] as Array<string | number>).concat(path || []),
    );

    if (!originValue && !allowEmpty) {
      onChange && onChange(this.getItems());
    }
  };

  componentDidUpdate(prevProps: ArrayElementProps) {
    const { hidden } = this.props;

    if (hidden !== prevProps.hidden) {
      this.init();
    }
  }

  handleAddItem = () => {
    const { onChange, items } = this.props;
    onChange &&
      onChange(
        this.getItems().concat([emptyValues[((items || {}).type as keyof typeof emptyValues) || 'object']]),
      );
  };

  handleDeleteItem = (index: number) => () => {
    const { onChange, value, allowEmpty, items /* actions */ } = this.props;
    const arr = Object.values(value || {});

    arr.splice(index, 1);

    if (!allowEmpty && !arr.length) {
      arr.push(emptyValues[(items?.type as keyof typeof emptyValues) || 'object']);
    }

    onChange && onChange(new ChangeEvent(arr, false, true) as unknown);
  };

  getItems = (): unknown[] => {
    const { value, items, allowEmpty } = this.props;
    const data = Object.values(value || {});
    return data.length || allowEmpty
      ? data
      : ([] as unknown[]).concat(emptyValues[((items || {}).type as keyof typeof emptyValues) || 'object']);
  };

  allowAdd = (): boolean | string | undefined => {
    const { rootDocument, value, steps, activeStep, allowAdd } = this.props;

    if (allowAdd && typeof allowAdd === 'string') {
      const result = evaluate(
        allowAdd,
        value,
        rootDocument.data[(steps as Array<string | number>)[activeStep as number]],
        rootDocument.data,
      );

      if (result instanceof Error) {
        (result as Error & { commit: (info: Record<string, unknown>) => void }).commit({ type: 'allowAdd check' });
        return true;
      }

      return result as boolean;
    }

    return allowAdd;
  };

  getStaticState = (): unknown => {
    const { staticState, rootDocument, value, steps, activeStep } = this.props;

    if (!staticState || typeof staticState !== 'string') {
      return staticState;
    }

    const result = evaluate(
      staticState,
      value,
      rootDocument.data[(steps as Array<string | number>)[activeStep as number]],
      rootDocument.data,
    );

    if (result instanceof Error) {
      console.error('staticState error', result);
      return undefined;
    }

    return result;
  };

  allowDelete = (): boolean | string | undefined => {
    const { rootDocument, value, steps, activeStep, allowDelete } = this.props;

    if (allowDelete && typeof allowDelete === 'string') {
      const result = evaluate(
        allowDelete,
        value,
        rootDocument.data[(steps as Array<string | number>)[activeStep as number]],
        rootDocument.data,
      );

      if (result instanceof Error) {
        (result as Error & { commit: (info: Record<string, unknown>) => void }).commit({ type: 'allowDelete check' });
        return true;
      }

      return result as boolean;
    }

    return allowDelete;
  };

  renderElement = (values: unknown, index: number) => {
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
      errors = [],
      path = [],
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
    } = this.props;
    const arrayItems = this.getItems();
    return (
      <ArrayElementItem
        key={index}
        error={errors.find((err) => err.path === path.concat(index).join('.'))}
        path={path.concat(index)}
        deleteAllowed={
          !!(this.allowDelete() &&
          !readOnly &&
          (allowEmpty || arrayItems.length > 1))
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
    let calcMaxElements: number | undefined = 0;

    if (maxElements) {
      calcMaxElements = maxElements as number;
      if (typeof maxElements === 'string') {
        const evaluatedMaxElements = evaluate(maxElements, rootDocument.data);

        if (evaluatedMaxElements instanceof Error) {
          (evaluatedMaxElements as Error & { commit: (info: Record<string, unknown>) => void }).commit({ type: 'array element maxElements' });
          calcMaxElements = undefined;
        } else {
          calcMaxElements = evaluatedMaxElements as number;
        }
      }
    }

    const allowAdding =
      (!calcMaxElements || arrayItems.length < calcMaxElements) && !readOnly;

    if (filterEmptyValues) {
      arrayItems = arrayItems.filter((item) => Object.keys(item as object).length > 0);
    }

    return (
      <ArrayElementContainer handleAddItem={this.handleAddItem} {...rest}>
        {arrayItems.map(this.renderElement)}
        {this.allowAdd() && allowAdding && !this.getStaticState() ? (
          <ArrayElementAddBtn
            addItemText={(addItem && addItem.text) || t('AddArrayItem')}
            handleAddItem={this.handleAddItem}
            disabled={locked}
          />
        ) : null}
      </ArrayElementContainer>
    );
  }
}

export default translate('Elements')(ArrayElement);
