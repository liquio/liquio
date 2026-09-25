/* eslint-disable @typescript-eslint/no-explicit-any */
import evaluate from 'helpers/evaluate';

export const resolveStepCondition = (condition: unknown, task: any, authInfo: any): unknown => {
  if (typeof condition === 'string') {
    return evaluate(condition, task.document.data, authInfo);
  }

  if (typeof condition === 'function') {
    return condition(task.document.data, authInfo, task?.meta, task?.activityLog);
  }

  return condition;
};

export default (task: any, template: any, authInfo: any): any[] => {
  if (!template || !task) {
    return [];
  }

  const { properties, stepOrders } = template.jsonSchema ?? {};

  let steps = evaluate(stepOrders, task.document.data, task?.meta, task?.activityLog) as any;

  if (steps instanceof Error) {
    steps = Object.keys(properties || []).filter((stepName) => {
      const { checkStepHidden } = properties[stepName];

      return !resolveStepCondition(checkStepHidden, task, authInfo);
    });

    let i = steps.length - 1;

    while (i >= 0) {
      const { checkStepFinal } = properties[steps[i]];
      if (checkStepFinal) {
        const isLast = Boolean(resolveStepCondition(checkStepFinal, task, authInfo));

        if (isLast) {
          steps = steps.slice(0, i + 1);
        }
      }
      i--;
    }
  }

  return steps;
};
