export default (userUnits = []) => {
  const basedOnUnitIds = [].concat(...userUnits.map(({ basedOn }) => basedOn));

  return (userUnits || [])
    .filter(({ head }) => head)
    .filter(({ id }) => !basedOnUnitIds.includes(id));
};
