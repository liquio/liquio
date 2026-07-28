import evaluate from 'helpers/evaluate';

export default ({
  value,
  steps,
  sample,
  activeStep,
  parentValue,
  rootDocument = {},
  schema: { getSample } = {},
}) => {
  if (getSample && typeof getSample === 'string') {
    try {
      const result = evaluate(
        getSample,
        value,
        rootDocument.data[steps[activeStep]],
        rootDocument.data,
        parentValue,
      );
      return result;
    } catch (e) {
      console.error('get sample error', getSample, e);
    }
  }

  return sample;
};
