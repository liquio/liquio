export default (nStr: number | string, separator: string): string => {
  let str = nStr + '';
  const x = str.split(' ');
  let x1 = x[0];
  const x2 = x.length > 1 ? '.' + x[1] : '';
  const rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + separator + '$2');
  }
  return x1 + x2;
};
