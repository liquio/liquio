import evaluate from 'helpers/evaluate';

export default (template, task) => {
  if (!template || !template.jsonSchema || !task.document.data) {
    return false;
  }

  const {
    jsonSchema: { pdfRequired }
  } = template;
  const {
    meta,
    document: { data }
  } = task;

  if (!pdfRequired) {
    return false;
  }

  if (typeof pdfRequired === 'boolean') {
    return pdfRequired;
  }

  if (typeof pdfRequired === 'string') {
    const result = evaluate(pdfRequired, data, meta, task?.activityLog);

    if (result instanceof Error) {
      result.commit({
        type: 'pdfRequired',
        task,
        template
      });

      return false;
    }
    return result;
  }

  return !!pdfRequired;
};
