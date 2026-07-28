export const cssLoader = (cssUrl) => {
  if (document.querySelector(`[href="${cssUrl}"]`)) {
    return;
  }

  const link = document.createElement('link');

  link.type = 'text/css';
  link.rel = 'stylesheet';
  link.href = cssUrl;

  document.body.appendChild(link);
};

export default (scriptUrl) =>
  new Promise((resolve) => {
    if (document.querySelector(`[src="${scriptUrl}"]`)) {
      return resolve();
    }

    const script = document.createElement('script');

    script.src = scriptUrl;
    script.onload = resolve;

    document.body.appendChild(script);
  });
