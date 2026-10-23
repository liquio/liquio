export default (str: string): string =>
  btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_match, p1: string) => String.fromCharCode(Number('0x' + p1))));
