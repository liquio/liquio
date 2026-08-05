export default (action, method, params) => {
  const form = document.createElement('form');
  form.style.display = 'none';
  form.action = action;
  form.method = method;
  // form.target = '_blank';

  Object.keys(params).forEach((key) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = params[key];
    form.appendChild(input);
  });

  return form;
};
