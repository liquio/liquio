function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  let expires = 'expires=' + d.toUTCString();

  const getDomainFromUrl = (url) => {
    const domain = url.match(/:\/\/(.[^/]+)/)[1];
    const domainParts = domain.split('.');
    const domainPartsLength = domainParts.length;
    const lastThreeDomainParts = domainParts.slice(domainPartsLength - 3, domainPartsLength);
    return lastThreeDomainParts.join('.');
  };

  const domain = getDomainFromUrl(window.location.origin);

  document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/;domain=' + domain;
}

export default setCookie;
