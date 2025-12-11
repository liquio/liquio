import evaluate from 'helpers/evaluate';

export default ({
  value,
  steps = [],
  activeStep,
  parentValue,
  rootDocument = { data: {} },
  userInfo,
  schema: { hidden, checkHidden } = {},
}) => {
  if (!hidden && !checkHidden) {
    return false;
  }

  if (typeof hidden === 'boolean') {
    return hidden;
  }

  if (hidden && typeof hidden === 'string') {
    try {
      const result = evaluate(
        hidden,
        rootDocument.data,
        value,
        parentValue,
        userInfo,
      );
      return result === true;
    } catch (e) {
      console.error('schema form isHidden', hidden, e);
    }
  }

  if (typeof checkHidden === 'boolean') {
    return checkHidden;
  }

  if (checkHidden && typeof checkHidden === 'string') {
    try {
      const result = evaluate(
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
