function setCookie(cname: string, cvalue: string, exdays: number): void {
  const d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  const expires = 'expires=' + d.toUTCString();

  const getDomainFromUrl = (url: string): string => {
    // Throws a TypeError when the origin has no "://" (e.g. the opaque origin "null"); preserved.
    const domain = (url.match(/:\/\/(.[^/]+)/) as RegExpMatchArray)[1];
    const domainParts = domain.split('.');
    const domainPartsLength = domainParts.length;
    const lastThreeDomainParts = domainParts.slice(domainPartsLength - 3, domainPartsLength);
    return lastThreeDomainParts.join('.');
  };

  const domain = getDomainFromUrl(window.location.origin);

  document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/;domain=' + domain;
}

export default setCookie;
