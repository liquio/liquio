import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

const getUserShortName = ({
  first_name: firstName,
  last_name: lastName,
  middle_name: middleName,
}) => {
  let shortName = '';
  if (lastName) {
    const lastNames = lastName.split('-');
    const capitalizedLastNames = lastNames
      .map((name) => capitalizeFirstLetter(name))
      .join('-');
    shortName += capitalizedLastNames;
  }

  if (firstName || middleName) {
    shortName += ' ';
  }

  if (firstName) {
    const firstNames = firstName.split('-');
    const shortenedFirstNames = firstNames
      .map((name) => name.charAt(0) + '.')
      .join('-');
    shortName += shortenedFirstNames;
  }

  if (middleName) {
    shortName += middleName.charAt(0) + '.';
  }

  return shortName;
};

export const getShortNameFromString = (userName = '') => {
  userName = userName.replace(/\s+/g, ' ');
  const arr = userName && userName.split(' ');
  if (arr && arr.length === 3) {
    return getUserShortName({
      last_name: arr[0],
      first_name: arr[1],
      middle_name: arr[2],
    });
  }
  return userName;
};

export default getUserShortName;
