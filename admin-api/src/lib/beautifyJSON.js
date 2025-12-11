module.exports = (jsonString) => {
  if (typeof jsonString !== 'string') {
    return jsonString;
  }

  if (/\r|\n/.exec(jsonString)) {
    return jsonString;
  }

  try {
    const json = JSON.parse(jsonString);
    return JSON.stringify(json, null, 4);
  } catch {
    return jsonString;
  }
};
