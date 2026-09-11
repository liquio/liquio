import evaluate from 'helpers/evaluate';

export default ({
  value,
  steps = [],
  readOnly,
  readonly,
  activeStep,
  parentValue,
  rootDocument = {},
  schema: { isDisabled, checkReadonly, checkReadOnly } = {},
}) => {
  let result = false;
  const checkReadOnlyValue = checkReadOnly || checkReadonly;

  if (typeof checkReadOnlyValue === 'boolean') {
    return checkReadOnlyValue;
  }

  if (checkReadOnlyValue && typeof checkReadOnlyValue === 'string') {
    try {
      result =
        readOnly ||
        evaluate(
          checkReadOnlyValue,
          value,
          rootDocument.data[steps[activeStep]],
          rootDocument.data,
          parentValue,
        );
    } catch (e) {
      console.error('schema isReadonly', checkReadOnlyValue, e);
    }
  }

  if (typeof isDisabled === 'boolean') {
    return isDisabled;
  }

  if (isDisabled && typeof isDisabled === 'string') {
    try {
      result =
        result ||
        evaluate(
          isDisabled,
          value,
          rootDocument.data[steps[activeStep]],
          rootDocument.data,
          parentValue,
        );
    } catch (e) {
      console.error('schema isDisabled', isDisabled, e);
    }
  }

  return readOnly || readonly || result;
};
