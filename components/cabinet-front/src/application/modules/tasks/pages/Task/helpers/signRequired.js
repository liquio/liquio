import evaluate from 'helpers/evaluate';

export default (template, task) => {
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
    const result = evaluate(signRequired, data, meta, task?.activityLog);

    if (result instanceof Error) {
      result.commit({
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
