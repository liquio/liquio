const deleteCookie = (name) => {
  const expires = 'expires=Thu, 01 Jan 1970 00:00:01 GMT';
  const hostname = window.location.hostname;
  const isLocalHost =
    hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname);

  document.cookie = `${name}=; ${expires}; path=/`;

  if (!isLocalHost) {
    const domainParts = hostname.split('.');
    const domain = domainParts
      .slice(Math.max(domainParts.length - 3, 0), domainParts.length)
      .join('.');

    document.cookie = `${name}=; ${expires}; path=/; domain=${domain}`;
  }
};

export default deleteCookie;
