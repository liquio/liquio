/* eslint-disable @typescript-eslint/no-explicit-any */
import evaluate from 'helpers/evaluate';

export default (template: any, task: any): boolean => {
  if (!template || !template.jsonSchema || !task.document.data) {
    return false;
  }

  const {
    jsonSchema: { signRequired }
  } = template;
  const {
    meta,
    document: { data }
  } = task;

  if (!signRequired) {
    return false;
  }

  if (typeof signRequired === 'boolean') {
    return signRequired;
  }

  if (typeof signRequired === 'string') {
    const result = evaluate(signRequired, data, meta, task?.activityLog) as any;

    if (result instanceof Error) {
      (result as Error & { commit: (context: any) => void }).commit({
        type: 'signRequired',
        task,
        template
      });

      return false;
    }
    return result;
  }

  return !!signRequired;
};
