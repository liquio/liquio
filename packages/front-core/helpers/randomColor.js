export default () => {
  const random = () => Math.floor(Math.random() * 255);
  const r = random();
  const g = random();
  const b = random();

  return `rgb(${r}, ${g}, ${b})`;
};
