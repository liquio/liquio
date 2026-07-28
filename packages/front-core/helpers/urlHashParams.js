import queryString from 'query-string';

export default () => {
  const params = queryString.parse(window.location.hash);
  window.history.replaceState('', document.title, window.location.pathname);
  return params;
};
