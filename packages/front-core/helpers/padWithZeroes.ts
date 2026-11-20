export default function padWithZeroes(number: number | string, length: number): string {
  let result = '' + number;
  while (result.length < length) {
    result = '0' + result;
  }

  return result;
}
