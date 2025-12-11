import getUserShortName from 'helpers/getUserShortName';

export default ({ firstName, lastName, middleName }) =>
  getUserShortName({
    first_name: firstName,
    last_name: lastName,
    middle_name: middleName
  });
