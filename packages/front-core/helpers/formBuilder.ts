export default (action: string, method: string, params: Record<string, string>): HTMLFormElement => {
  const form = document.createElement('form');
  form.style.display = 'none';
  form.action = action;
  form.method = method;

  Object.keys(params).forEach((key) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = params[key];
    form.appendChild(input);
  });

  return form;
};
