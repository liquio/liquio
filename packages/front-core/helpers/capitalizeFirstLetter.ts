export default function capitalizeFirstLetter(string: string, onlyFirst = false): string {
  const value = string || '';
  if (onlyFirst) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('-');
}
