import evaluate from 'helpers/evaluate';

export default ({
  value,
  steps,
  sample,
  activeStep,
  parentValue,
  rootDocument = { data: {} },
  schema: { getSample } = {},
}: {
  value?: unknown;
  steps: string[];
  sample?: unknown;
  activeStep: number;
  parentValue?: unknown;
  rootDocument?: { data: Record<string, unknown> };
  schema: { getSample?: string };
}): unknown => {
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
