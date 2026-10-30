import getUserShortName from 'helpers/getUserShortName';

interface UserNameProps {
  firstName?: string;
  lastName?: string;
  middleName?: string;
}

export default ({ firstName, lastName, middleName }: UserNameProps) =>
  getUserShortName({
    first_name: firstName,
    last_name: lastName,
    middle_name: middleName
  });
