function getDomainFromUrl(url: string): string | null {
  const domain = url.match(/:\/\/([^/:]+)/)?.[1];

  const isLocalHost = domain === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(domain ?? '');

  if (!domain || isLocalHost) {
    return null;
  }

  const domainParts = domain.split('.');
  const domainPartsLength = domainParts.length;
  const lastThreeDomainParts = domainParts.slice(domainPartsLength - 3, domainPartsLength);
  return lastThreeDomainParts.join('.');
}

function setCookie(cname: string, cvalue: string, exdays: number): void {
  const d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  const expires = 'expires=' + d.toUTCString();

  const domain = getDomainFromUrl(window.location.origin);
  const domainPart = domain ? `;domain=${domain}` : '';

  document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/' + domainPart;
}

export default setCookie;
