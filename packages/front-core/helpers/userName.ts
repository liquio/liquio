import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

interface UserNameInput {
  isLegal?: boolean;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  companyName?: string;
}

const userName = ({ isLegal, first_name: firstName, last_name: lastName, middle_name: middleName, companyName }: UserNameInput): string => {
  if (isLegal) {
    return companyName || '';
  }

  return [lastName, firstName, middleName].map((el) => capitalizeFirstLetter(el || '', false)).join(' ');
};

export const formatUserName = (name = ''): string => {
  const arr = (name || '').split(' ');
  if (arr.length > 1) {
    return arr.map((part) => capitalizeFirstLetter(part)).join(' ');
  }
  return capitalizeFirstLetter(name);
};

export default userName;
