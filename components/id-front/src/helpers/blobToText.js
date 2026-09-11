export default function (blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsText(blob);
    reader.onloadend = () => resolve(reader.result);
  });
}
