export default function (number, length) {
  let result = '' + number;
  while (result.length < length) {
    result = '0' + result;
  }

  return result;
}
