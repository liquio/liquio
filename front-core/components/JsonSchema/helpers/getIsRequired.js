import evaluate from 'helpers/evaluate';

export default ({
  value,
  steps = [],
  required,
  activeStep,
  parentValue,
  rootDocument = {},
  schema: { checkRequired } = {},
}) => {
  if (typeof checkRequired === 'boolean') {
    return checkRequired;
  }

  if (checkRequired && typeof checkRequired === 'string') {
    try {
      const result = evaluate(
        checkRequired,
        value,
        rootDocument.data[steps[activeStep]] || rootDocument.data,
        rootDocument.data,
        parentValue,
      );

      return (typeof required === 'boolean' && required) || result === true;
    } catch (e) {
      console.error('schema check isRequired error', checkRequired, e);
    }
  }

  return typeof required === 'boolean' && required;
};
