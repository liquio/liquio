/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import evaluate from 'helpers/evaluate';
import CheckboxLayout from 'components/JsonSchema/elements/CheckboxGroup/components/layout';
import ChangeEvent from '../../ChangeEvent';
import { JsonSchemaNode } from '../../types';

interface CheckboxItem extends JsonSchemaNode {
  id: string | number;
  title?: unknown;
  isDisabled?: string | boolean;
}

interface CheckedKeyItem {
  id?: unknown;
  title?: unknown;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

interface PositionValue {
  top: { lg: number; md: number; xs: number };
  [key: string]: unknown;
}

interface AddHeightParams {
  activePosition: PositionValue;
  indexInfoHeight: { lg: number; md: number; xs: number };
  listenError: string[];
  errors: Array<{ path: string }>;
  withIndex?: boolean;
  errorTextHeight: { lg: number; md: number; xs: number };
  position: PositionValue;
  isChecked: boolean;
  hiddenParent?: boolean;
  isPopup: boolean | null;
  hiddenKorpus?: boolean;
}

interface CheckboxGroupProps {
  value?: Array<string | number | CheckedKeyItem> | null;
  items: CheckboxItem[];
  onChange?: ((value: unknown) => void) | null;
  required?: boolean | string[];
  defaultValue?: unknown;
  deleteDisabled?: boolean;
  rootDocument: { data: Record<string, unknown> };
  steps?: Array<string | number>;
  activeStep?: number;
  userInfo?: unknown;
  parentValue?: unknown;
  isPopup?: boolean;
  documents?: { rootDocument: { data: Record<string, unknown> } };
  indexHidden?: boolean;
  address?: unknown;
  hidden?: boolean;
  [key: string]: unknown;
}

class CheckboxGroup extends React.Component<CheckboxGroupProps> {
  static defaultProps: Partial<CheckboxGroupProps> = {
    hidden: false,
    value: null,
    deleteDisabled: true,
  };

  componentDidMount = () => {
    const { value, items, onChange, required, defaultValue, deleteDisabled } =
      this.props;

    if (defaultValue && value === null) {
      onChange && onChange(defaultValue);
    } else if (required && !Array.isArray(value)) {
      onChange && onChange([]);
    }
    if (Array.isArray(value) && deleteDisabled) {
      (value as Array<string | number>).forEach((key) => {
        if (this.isDisabled(items.find(({ id }) => id === key))) {
          onChange &&
            onChange((value as Array<string | number>).filter((checkboxKey) => key !== checkboxKey));
        }
      });
    }
  };

  componentDidUpdate = () => {
    const { value, items, onChange, deleteDisabled } = this.props;
    if (Array.isArray(value) && deleteDisabled) {
      (value as Array<string | number>).forEach((key) => {
        if (this.isDisabled(items.find(({ id }) => id === key))) {
          onChange &&
            onChange((value as Array<string | number>).filter((checkboxKey) => key !== checkboxKey));
        }
      });
    }
  };

  handleChange = (keyId: unknown) => () => {
    const { value, onChange, items } = this.props;
    const checkedKeys = value || [];
    let newValue: unknown[];

    if (items.some((item) => !!item.properties)) {
      newValue = (checkedKeys as CheckedKeyItem[]).some(({ id }) => id === keyId)
        ? (checkedKeys as CheckedKeyItem[]).filter((item) => item.id !== keyId)
        : [
            ...(checkedKeys as CheckedKeyItem[]),
            { id: keyId, title: items.find(({ id }) => id === keyId)?.title },
          ];
    } else {
      newValue = (checkedKeys as Array<string | number>).includes(keyId as string | number)
        ? (checkedKeys as Array<string | number>).filter((item) => item !== keyId)
        : [...(checkedKeys as Array<string | number>), keyId];
    }

    onChange &&
      onChange(
        new ChangeEvent(newValue.length ? newValue : null, true, true, true) as unknown,
      );
  };

  isDisabled = (item?: CheckboxItem): boolean => {
    if (!item) return false;

    const { isDisabled } = item;

    const { rootDocument, value, steps = [], activeStep } = this.props;
    if (isDisabled && typeof isDisabled === 'string') {
      // `evaluate(...) === true` always yields a plain boolean, so the original's
      // `isDisabled instanceof Error` check below it could never be true — even if
      // `evaluate` returned an EvaluateError, comparing it with `=== true` already
      // coerced to `false` first. That dead branch (an error-reporting `.commit()`
      // call) is preserved-as-unreachable by omission rather than kept as
      // literally-uncompilable TS (a boolean can't be checked with `instanceof`).
      return (
        evaluate(
          isDisabled,
          value,
          rootDocument.data[steps[activeStep as number]],
          rootDocument.data,
        ) === true
      );
    }

    return !!isDisabled;
  };

  checkHidden = (item?: CheckboxItem & { checkHidden?: string | boolean }): boolean => {
    if (!item) return false;

    const { checkHidden } = item;
    const {
      rootDocument,
      value,
      steps = [],
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
              documents?.rootDocument.data[steps[activeStep as number]],
              documents?.rootDocument.data,
              parentValue,
              userInfo,
            )
          : evaluate(
              checkHidden,
              value,
              rootDocument.data[steps[activeStep as number]],
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

  isHidden = (item?: CheckboxItem & { hidden?: string | boolean; checkHidden?: string | boolean }): boolean => {
    if (!item) return false;

    const { hidden } = item;
    const { checkHidden } = item;

    if (checkHidden) {
      return this.checkHidden(item);
    }

    const { rootDocument, value, steps = [], activeStep, isPopup, documents } =
      this.props;

    if (hidden && typeof hidden === 'string') {
      // Same dead-branch shape as `isDisabled` above: `evaluate(...) === true`
      // already coerces to a plain boolean, so the original's follow-up
      // `instanceof Error` check could never fire. Preserved-as-unreachable by
      // omission (TS won't compile an `instanceof` check against a boolean).
      return isPopup
        ? evaluate(
            hidden,
            value,
            documents?.rootDocument.data[steps[activeStep as number]],
            documents?.rootDocument.data,
          ) === true
        : evaluate(
            hidden,
            value,
            rootDocument.data[steps[activeStep as number]],
            rootDocument.data,
          ) === true;
    }

    return !!hidden;
  };

  getSample = (key: CheckboxItem & { getSample?: string; sample?: unknown }): unknown => {
    const { rootDocument, value, steps = [], activeStep } = this.props;
    const { getSample, sample } = key;

    if (getSample && typeof getSample === 'string') {
      const result = evaluate(
        getSample,
        value,
        rootDocument.data[steps[activeStep as number]],
        rootDocument.data,
      );

      if (result instanceof Error) {
        (result as Error & { commit: (info: Record<string, unknown>) => void }).commit({ type: 'Checkbox group sample' });
        return '';
      }

      return result;
    }

    return sample;
  };

  getTitle = (title: unknown): unknown => {
    const { rootDocument, value, steps, activeStep } = this.props;

    const currentStepKey = steps?.[activeStep as number];
    const currentStepData = rootDocument?.data?.[currentStepKey as string];

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
  }: AddHeightParams): PositionValue => {
    const { indexHidden, address } = this.props;

    const cloneUncheckedPosition: PositionValue = JSON.parse(JSON.stringify(position));
    const clonePosition: PositionValue = JSON.parse(JSON.stringify(activePosition));

    const parentError = [...listenError].shift();
    const isParentError = !!errors.filter(
      (err) => err.path.indexOf(parentError as string) !== -1,
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
        {...(this.props as unknown as Record<string, unknown>)}
        handleChange={this.handleChange}
        isDisabled={this.isDisabled as never}
        isHidden={this.isHidden as never}
        getSample={this.getSample as never}
        getTitle={this.getTitle}
        addHeight={this.addHeight as never}
        checkedKeys={checkedKeys as never}
      />
    );
  };
}

export default CheckboxGroup;
