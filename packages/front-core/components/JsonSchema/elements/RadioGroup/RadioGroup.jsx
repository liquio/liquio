/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import evaluate from 'helpers/evaluate';

import { Radio, RadioGroup, FormControlLabel } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import renderHTML from 'helpers/renderHTML';
import styles from 'components/JsonSchema/elements/RadioGroup/components/layout';
import Property from 'components/JsonSchema/elements/RadioGroup/components/Property';

import { ElementGroupContainer } from 'components/JsonSchema';
import ChangeEvent from 'components/JsonSchema/ChangeEvent';

class RadioGroupElement extends React.Component {
  componentDidMount() {
    this.init();
  }

  componentDidUpdate({ path, activeStep }) {
    const { path: newPath, activeStep: newActiveStep } = this.props;

    if (path.join() !== newPath.join() || newActiveStep !== activeStep) {
      this.init();
    }
  }

  init = () => {
    const { onChange, value, defaultValue, type, items, rootDocument } =
      this.props;

    if (value) {
      const selectedItem = items.find(
        ({ id }) => id === (typeof value === 'object' ? value.id : value),
      );
      if (selectedItem && this.isDisabled(selectedItem)) {
        onChange && onChange(null);
      }
    }

    if (defaultValue && value === null) {
      let defaultValueEvalated = defaultValue;

      const result = evaluate(defaultValue, rootDocument.data);

      if (!(result instanceof Error)) defaultValueEvalated = result;

      const newValue =
        type === 'object'
          ? items.find(({ id }) => id === defaultValueEvalated)
          : defaultValueEvalated;

      onChange && onChange(newValue);
    }
  };

  handleChange = (itemId) => () => {
    const { onChange, type, items } = this.props;
    const changeData =
      type === 'object'
        ? {
            id: items.find(({ id }) => id === itemId).id,
            title: items.find(({ id }) => id === itemId).title,
          }
        : itemId;
    onChange && onChange(new ChangeEvent(changeData, true, true, true));
  };

  checkHidden = (item) => {
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
              documents?.rootDocument.data[steps[activeStep]],
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

  isDisabled = ({ isDisabled }) => {
    const { rootDocument, value, steps, activeStep } = this.props;
    if (isDisabled && typeof isDisabled === 'string') {
      const result = evaluate(
        isDisabled,
        value,
        rootDocument.data[steps[activeStep]],
        rootDocument.data,
      );

      if (result instanceof Error) {
        result.commit({ type: 'radio group check disabled' });
        return false;
      }

      return result;
    }

    return isDisabled;
  };

  getSample = (key) => {
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
        result.commit({ type: 'Radio group get sample' });
        return '';
      }

      return result;
    }

    return sample;
  };

  getTitle = (title) => {
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

  getDescription = () => {
    const { description } = this.props;
    const { rootDocument, value, steps, activeStep } = this.props;

    const result = evaluate(
      description,
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
      items,
      rowDirection,
      path,
      type,
      readOnly,
      displayAllSamples,
      onChange,
    } = this.props;
    const valueId = type === 'object' ? (value || {}).id : value;

    return (
      <RadioGroup
        id={path.join('-')}
        row={rowDirection}
        className={classNames({
          [classes.root]: true,
          [classes.row]: rowDirection,
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
                disabled={this.isDisabled(key) || readOnly}
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
                      [classes.radioMargin]: rowDirection,
                    })}
                    aria-label={this.getTitle(key.title)}
                  />
                }
                label={this.getTitle(key.title)}
              />
              {!rowDirection && (displayAllSamples || valueId === key.id) ? (
                <span>{renderHTML(this.getSample(key) || '')}</span>
              ) : null}
              {key.properties ? (
                <Property
                  properties={key.properties}
                  value={value}
                  path={path}
                  readOnly={readOnly}
                  onChange={onChange}
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
        description={this.getDescription()}
        required={required}
        error={error}
        variant={typography}
        width={width}
        maxWidth={maxWidth}
        {...rest}
      >
        {this.renderElement()}
      </ElementGroupContainer>
    );
  }
}

RadioGroupElement.propTypes = {
  items: PropTypes.array,
  rowDirection: PropTypes.bool,
  classes: PropTypes.object.isRequired,
  rootDocument: PropTypes.object.isRequired,
  activeStep: PropTypes.number.isRequired,
  steps: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.array,
  path: PropTypes.array,
  readOnly: PropTypes.bool,
  description: PropTypes.string,
  displayAllSamples: PropTypes.bool,
  typography: PropTypes.string,
};

RadioGroupElement.defaultProps = {
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

export default withStyles(styles)(RadioGroupElement);
