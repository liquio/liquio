export default (input) => {
  const keyLength = Object.values(input).length;
  const key = new Uint8Array(keyLength);
  for (let i = 0; i < keyLength; i++) {
    key[i] = input[i];
  }
  return key;
};
