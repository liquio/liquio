import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

const userName = ({
  isLegal,
  first_name: firstName,
  last_name: lastName,
  middle_name: middleName,
  companyName,
}) => {
  if (isLegal) {
    return companyName;
  }

  return [lastName, firstName, middleName]
    .map((el) => capitalizeFirstLetter(el, false))
    .join(' ');
};

export const formatUserName = (name = '') => {
  const arr = (name || '').split(' ');
  if (arr.length > 1) {
    return arr.map(capitalizeFirstLetter).join(' ');
  }
  return capitalizeFirstLetter(name);
};

export default userName;
