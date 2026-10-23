/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import classNames from 'classnames';
import evaluate from 'helpers/evaluate';
import EvaluateError from 'helpers/evaluate/EvaluateError';

import { Radio, RadioGroup, FormControlLabel } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import renderHTML from 'helpers/renderHTML';
import styles from 'components/JsonSchema/elements/RadioGroup/components/layout';
import Property from 'components/JsonSchema/elements/RadioGroup/components/Property';

import { ElementGroupContainer } from 'components/JsonSchema';
import ChangeEvent from 'components/JsonSchema/ChangeEvent';
import { RootDocument } from '../../types';

interface RadioItem {
  id: string | number;
  title?: string;
  sample?: string;
  getSample?: string;
  isDisabled?: string | boolean;
  checkHidden?: string | boolean;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

interface RadioGroupElementProps extends WithStyles<typeof styles> {
  items?: RadioItem[];
  rowDirection?: boolean;
  rootDocument: RootDocument;
  activeStep: number;
  steps: string[];
  onChange: ((event: InstanceType<typeof ChangeEvent> | null) => void) | null;
  value?: { id?: string | number } | string | number | null;
  path: Array<string | number>;
  readOnly?: boolean;
  description?: string;
  displayAllSamples?: boolean;
  typography?: string;
  defaultValue?: unknown;
  type?: string;
  userInfo?: unknown;
  parentValue?: unknown;
  isPopup?: boolean;
  documents?: { rootDocument: RootDocument };
  sample?: string;
  required?: boolean;
  error?: unknown;
  hidden?: boolean;
  width?: number | string;
  maxWidth?: number | string;
  [key: string]: unknown;
}

class RadioGroupElement extends React.Component<RadioGroupElementProps> {
  static defaultProps = {
    items: [],
    rowDirection: true,
    value: null,
    path: [],
    readOnly: false,
    typography: 'subtitle1',
    displayAllSamples: false,
    description: '',
    steps: [],
  };

  componentDidMount() {
    this.init();
  }

  componentDidUpdate({ path, activeStep }: RadioGroupElementProps) {
    const { path: newPath, activeStep: newActiveStep } = this.props;

    if (path.join() !== newPath.join() || newActiveStep !== activeStep) {
      this.init();
    }
  }

  init = () => {
    const { onChange, value, defaultValue, type, items, rootDocument } =
      this.props;

    if (value) {
      const selectedItem = (items as RadioItem[]).find(
        ({ id }) => id === (typeof value === 'object' ? value.id : value),
      );
      if (selectedItem && this.isDisabled(selectedItem)) {
        onChange?.(null);
      }
    }

    if (defaultValue && value === null) {
      let defaultValueEvalated: unknown = defaultValue;

      const result = evaluate(defaultValue as string, rootDocument.data);

      if (!(result instanceof Error)) defaultValueEvalated = result;

      const newValue =
        type === 'object'
          ? (items as RadioItem[]).find(({ id }) => id === defaultValueEvalated)
          : defaultValueEvalated;

      onChange?.(newValue as unknown as InstanceType<typeof ChangeEvent>);
    }
  };

  handleChange = (itemId: string | number) => () => {
    const { onChange, type, items } = this.props;
    const changeData =
      type === 'object'
        ? {
            id: (items as RadioItem[]).find(({ id }) => id === itemId)?.id,
            title: (items as RadioItem[]).find(({ id }) => id === itemId)?.title,
          }
        : itemId;
    onChange?.(new ChangeEvent(changeData, true, true, true) as InstanceType<typeof ChangeEvent>);
  };

  checkHidden = (item: RadioItem | undefined): boolean => {
    if (!item) return false;

    const { checkHidden } = item;
    const {
      rootDocument,
      value,
      steps,
      activeStep,
      userInfo,
      parentValue,
      isPopup,
      documents,
    } = this.props;

    if (typeof checkHidden === 'boolean') {
      return checkHidden;
    }

    if (checkHidden && typeof checkHidden === 'string') {
      try {
        const result = isPopup
          ? evaluate(
              checkHidden,
              value,
              (documents?.rootDocument.data as Record<string, unknown>)[steps[activeStep]],
              documents?.rootDocument.data,
              parentValue,
              userInfo,
            )
          : evaluate(
              checkHidden,
              value,
              rootDocument.data[steps[activeStep]],
              rootDocument.data,
              parentValue,
              userInfo,
            );

        return result === true;
      } catch (e) {
        console.error('schema check isHidden error', checkHidden, e);
      }
    }

    return false;
  };

  isDisabled = ({ isDisabled }: RadioItem): unknown => {
    const { rootDocument, value, steps, activeStep } = this.props;
    if (isDisabled && typeof isDisabled === 'string') {
      const result = evaluate(
        isDisabled,
        value,
        rootDocument.data[steps[activeStep]],
        rootDocument.data,
      );

      if (result instanceof Error) {
        (result as EvaluateError).commit({ type: 'radio group check disabled' });
        return false;
      }

      return result;
    }

    return isDisabled;
  };

  getSample = (key: RadioItem): unknown => {
    const { rootDocument, value, steps, activeStep } = this.props;
    const { getSample, sample } = key;

    if (getSample && typeof getSample === 'string') {
      const result = evaluate(
        getSample,
        value,
        rootDocument.data[steps[activeStep]],
        rootDocument.data,
      );

      if (result instanceof Error) {
        (result as EvaluateError).commit({ type: 'Radio group get sample' });
        return '';
      }

      return result;
    }

    return sample;
  };

  getTitle = (title: string | undefined): unknown => {
    const { rootDocument, value, steps, activeStep } = this.props;

    if (!title) return false;

    const result = evaluate(
      title,
      value,
      rootDocument.data[steps[activeStep]],
      rootDocument.data,
    );

    if (result instanceof Error) return title;

    return result;
  };

  getDescription = (): unknown => {
    const { description } = this.props;
    const { rootDocument, value, steps, activeStep } = this.props;

    const result = evaluate(
      description as string,
      value,
      rootDocument.data[steps[activeStep]],
      rootDocument.data,
    );

    if (result instanceof Error) return description;

    return result;
  };

  renderElement() {
    const {
      classes,
      value,
      items = [],
      rowDirection,
      path,
      type,
      readOnly,
      displayAllSamples,
      onChange,
    } = this.props;
    const valueId = type === 'object' ? ((value as { id?: string | number }) || {}).id : value;

    return (
      <RadioGroup
        id={path.join('-')}
        row={rowDirection}
        className={classNames({
          [classes.root]: true,
          [classes.row]: !!rowDirection,
          [classes.distance]: !rowDirection,
        })}
      >
        {items.map((key, index) => {
          const id = (path || []).join('-') + '-discription' + index;

          const isHidden = this.checkHidden(key);

          if (isHidden) return null;

          return (
            <div key={key.id}>
              <FormControlLabel
                id={id}
                className={classes.labelSize}
                disabled={!!(this.isDisabled(key) || readOnly)}
                control={
                  <Radio
                    color="primary"
                    id={path.concat(key.id).join('-')}
                    checked={valueId === key.id}
                    onChange={this.handleChange(key.id)}
                    inputProps={{
                      'aria-describedby': id,
                      'aria-labelledby': id,
                    }}
                    className={classNames({
                      [classes.radioMargin]: !!rowDirection,
                    })}
                    aria-label={this.getTitle(key.title) as string}
                  />
                }
                label={this.getTitle(key.title) as string}
              />
              {!rowDirection && (displayAllSamples || valueId === key.id) ? (
                <span>{renderHTML((this.getSample(key) as string) || '')}</span>
              ) : null}
              {key.properties ? (
                <Property
                  properties={key.properties as Record<string, import('../../types').JsonSchemaNode>}
                  value={value as { properties?: Record<string, unknown> }}
                  path={path}
                  readOnly={readOnly}
                  onChange={onChange as (...args: unknown[]) => void}
                  props={this.props}
                />
              ) : null}
            </div>
          );
        })}
      </RadioGroup>
    );
  }

  render() {
    const {
      sample,
      required,
      error,
      hidden,
      width,
      maxWidth,
      typography,
      ...rest
    } = this.props;

    if (hidden) return null;

    return (
      <ElementGroupContainer
        sample={sample}
        description={this.getDescription() as string}
        required={required}
        error={error}
        variant={typography as never}
        width={width}
        maxWidth={maxWidth as number}
        {...rest}
      >
        {this.renderElement()}
      </ElementGroupContainer>
    );
  }
}

export default withStyles(styles)(RadioGroupElement);
