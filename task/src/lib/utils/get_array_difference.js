function getArrayDifference(oldArray, newArray){
  const differentItems = [...oldArray.filter(id => !newArray.includes(id)), ...newArray.filter(id => !oldArray.includes(id))];
  return differentItems;
}

module.exports = getArrayDifference;
