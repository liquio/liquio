export default function capitalizeFirstLetter(string) {
  const value = string || '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
