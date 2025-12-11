import evaluate from 'helpers/evaluate';

export default (task, template, authInfo) => {
  if (!template || !task) {
    return [];
  }

  const { properties, stepOrders } = template.jsonSchema;

  let steps = evaluate(stepOrders, task.document.data, task?.meta, task?.activityLog);

  if (steps instanceof Error) {
    steps = Object.keys(properties || []).filter((stepName) => {
      const { checkStepHidden } = properties[stepName];

      if (typeof checkStepHidden !== 'string') {
        return !checkStepHidden;
      }

      return !evaluate(checkStepHidden, task.document.data);
    });

    let i = steps.length - 1;

    while (i >= 0) {
      const { checkStepFinal } = properties[steps[i]];
      if (checkStepFinal) {
        let isLast = false;
        if (typeof checkStepFinal === 'string') {
          isLast = evaluate(checkStepFinal, task.document.data, authInfo);
        } else if (typeof checkStepFinal === 'boolean') {
          isLast = checkStepFinal;
        }

        if (isLast) {
          steps = steps.slice(0, i + 1);
        }
      }
      i--;
    }
  }

  return steps;
};
