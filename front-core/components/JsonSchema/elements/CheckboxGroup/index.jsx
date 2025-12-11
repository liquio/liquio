/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import evaluate from 'helpers/evaluate';
import CheckboxLayout from 'components/JsonSchema/elements/CheckboxGroup/components/layout';
import ChangeEvent from '../../ChangeEvent';

class CheckboxGroup extends React.Component {
  componentDidMount = () => {
    const { value, items, onChange, required, defaultValue, deleteDisabled } =
      this.props;

    if (defaultValue && value === null) {
      onChange && onChange(defaultValue);
    } else if (required && !Array.isArray(value)) {
      onChange && onChange([]);
    }
    if (Array.isArray(value) && deleteDisabled) {
      value.forEach((key) => {
        if (this.isDisabled(items.find(({ id }) => id === key))) {
          onChange &&
            onChange(value.filter((checkboxKey) => key !== checkboxKey));
        }
      });
    }
  };

  componentDidUpdate = () => {
    const { value, items, onChange, deleteDisabled } = this.props;
    if (Array.isArray(value) && deleteDisabled) {
      value.forEach((key) => {
        if (this.isDisabled(items.find(({ id }) => id === key))) {
          onChange &&
            onChange(value.filter((checkboxKey) => key !== checkboxKey));
        }
      });
    }
  };

  handleChange = (keyId) => () => {
    const { value, onChange, items } = this.props;
    const checkedKeys = value || [];
    let newValue;

    if (items.some((item) => !!item.properties)) {
      newValue = checkedKeys.some(({ id }) => id === keyId)
        ? checkedKeys.filter((item) => item.id !== keyId)
        : [
            ...checkedKeys,
            { id: keyId, title: items.find(({ id }) => id === keyId)?.title },
          ];
    } else {
      newValue = checkedKeys.includes(keyId)
        ? checkedKeys.filter((item) => item !== keyId)
        : [...checkedKeys, keyId];
    }

    onChange &&
      onChange(
        new ChangeEvent(newValue.length ? newValue : null, true, true, true),
      );
  };

  isDisabled = (item) => {
    if (!item) return false;

    let { isDisabled } = item;

    const { rootDocument, value, steps, activeStep } = this.props;
    if (isDisabled && typeof isDisabled === 'string') {
      isDisabled =
        evaluate(
          isDisabled,
          value,
          rootDocument.data[steps[activeStep]],
          rootDocument.data,
        ) === true;

      if (isDisabled instanceof Error) {
        isDisabled.commit({ type: 'checkbox group check disabled' });
        isDisabled = false;
      }
    }

    return isDisabled;
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

  isHidden = (item) => {
    if (!item) return false;

    let { hidden, checkHidden } = item;

    if (checkHidden) {
      return this.checkHidden(item);
    }

    const { rootDocument, value, steps, activeStep, isPopup, documents } =
      this.props;

    if (hidden && typeof hidden === 'string') {
      hidden = isPopup
        ? evaluate(
            hidden,
            value,
            documents?.rootDocument.data[steps[activeStep]],
            documents?.rootDocument.data,
          ) === true
        : evaluate(
            hidden,
            value,
            rootDocument.data[steps[activeStep]],
            rootDocument.data,
          ) === true;

      if (hidden instanceof Error) {
        hidden.commit({ type: 'Checkbox group hidden' });
        hidden = false;
      }
    }

    return hidden;
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
        result.commit({ type: 'Checkbox group sample' });
        return '';
      }

      return result;
    }

    return sample;
  };

  getTitle = (title) => {
    const { rootDocument, value, steps, activeStep } = this.props;

    const currentStepKey = steps?.[activeStep];
    const currentStepData = rootDocument?.data?.[currentStepKey];

    if (title && typeof title === 'string') {
      const result = evaluate(
        title,
        value,
        currentStepData,
        rootDocument.data,
      );

      if (result instanceof Error) {
        return title;
      }

      return result;
    }

    return title;
  };

  addHeight = ({
    activePosition,
    indexInfoHeight,
    listenError,
    errors,
    withIndex,
    errorTextHeight,
    position,
    isChecked,
    hiddenParent,
    isPopup,
    hiddenKorpus,
  }) => {
    const { indexHidden, address} = this.props;

    const cloneUncheckedPosition = JSON.parse(JSON.stringify(position));
    const clonePosition = JSON.parse(JSON.stringify(activePosition));

    const parentError = [...listenError].shift();
    const isParentError = !!errors.filter(
      (err) => err.path.indexOf(parentError) !== -1,
    ).length;
    const isIndexError = !!errors.filter(
      (err) => err.path.indexOf(listenError[1]) !== -1,
    ).length;

    let updateHeight = 0;
    const erroText = -20;

    const { innerWidth } = window;

    if (!isChecked) {
      updateHeight += hiddenParent && withIndex ? 10 : 0;
      updateHeight -=
        withIndex && (isIndexError || isParentError) ? erroText : 0;
      updateHeight -= withIndex && isIndexError && isParentError ? erroText : 0;
      if (innerWidth > 1280) {
        updateHeight += withIndex ? 35 : indexInfoHeight.lg;
        cloneUncheckedPosition.top.lg += updateHeight;
      } else if (innerWidth > 960 && innerWidth < 1280) {
        updateHeight += withIndex ? -50 : indexInfoHeight.lg;
        updateHeight -= hiddenKorpus ? 95 : 0;
        cloneUncheckedPosition.top.lg += updateHeight;
      } else if (innerWidth > 600 && innerWidth < 960) {
        updateHeight += withIndex ? 35 : indexInfoHeight.md;
        updateHeight += hiddenParent ? 85 : 90;
        updateHeight -= 120;
        cloneUncheckedPosition.top.md += updateHeight;
      } else if (innerWidth < 600) {
        updateHeight += withIndex ? 35 : indexInfoHeight.xs;
        updateHeight -= 113;
        cloneUncheckedPosition.top.xs += updateHeight;
      }

      return cloneUncheckedPosition;
    }

    if (innerWidth > 1280) {
      updateHeight += withIndex ? indexInfoHeight.lg : 40;
      updateHeight += hiddenParent ? 38 : 40;
      updateHeight += isIndexError ? 19 : 0;
      updateHeight += isParentError ? errorTextHeight.lg : 0;
      updateHeight += isParentError && !isIndexError ? erroText : 0;
      updateHeight += isParentError && isIndexError ? erroText : 0;
      clonePosition.top.lg += updateHeight;
    } else if (innerWidth > 960 && innerWidth < 1280) {
      updateHeight += withIndex ? -68 : 40;
      updateHeight += hiddenParent ? 38 : 0;
      updateHeight += isIndexError ? 19 : 0;
      updateHeight += hiddenKorpus ? 50 : 0;
      updateHeight += isParentError ? errorTextHeight.lg : 0;
      updateHeight += isParentError && !isIndexError ? erroText : 0;
      updateHeight += isParentError && isIndexError ? erroText : 0;
      clonePosition.top.lg += updateHeight;
    } else if (innerWidth > 600 && innerWidth < 960) {
      updateHeight += withIndex
        ? indexInfoHeight.md - 40
        : isPopup
        ? indexInfoHeight.md
        : 0;
      updateHeight += isParentError ? errorTextHeight.md : 0;
      updateHeight += isPopup ? 175 : 213;
      updateHeight -= hiddenParent ? clonePosition.top.md + 210 : 0;
      updateHeight += hiddenKorpus ? 150 : 0;
      updateHeight -= 177;
      clonePosition.top.md += updateHeight;
    } else if (innerWidth < 600) {
      updateHeight += withIndex ? indexInfoHeight.xs + 110 : 144;
      updateHeight += isParentError ? errorTextHeight.xs : 0;
      updateHeight -= hiddenParent ? clonePosition.top.xs + 143 : 0;
      updateHeight += hiddenKorpus ? 145 : 0;
      updateHeight -= address ? 40 : 180;
      updateHeight += isPopup && innerWidth > 480 ? 11 : 0;
      updateHeight += indexHidden ? 145 : 0;
      clonePosition.top.xs += updateHeight;
    }

    return clonePosition;
  };

  render = () => {
    const { value, hidden } = this.props;
    const checkedKeys = value || [];

    if (hidden) return null;

    return (
      <CheckboxLayout
        {...this.props}
        {...this.state}
        handleChange={this.handleChange}
        isDisabled={this.isDisabled}
        isHidden={this.isHidden}
        getSample={this.getSample}
        getTitle={this.getTitle}
        addHeight={this.addHeight}
        checkedKeys={checkedKeys}
      />
    );
  };
}

CheckboxGroup.propTypes = {
  hidden: PropTypes.bool,
  value: PropTypes.array,
  deleteDisabled: PropTypes.bool,
};

CheckboxGroup.defaultProps = {
  hidden: false,
  value: null,
  deleteDisabled: true,
};

export default CheckboxGroup;
