import { getShortNameFromString } from 'helpers/getUserShortName';

interface UserNamesLabelsProps {
  userNames?: string[];
}

const UserNamesLabels = ({ userNames = [] }: UserNamesLabelsProps) =>
  userNames.map((userName) => getShortNameFromString(userName)).join(', ');

export default UserNamesLabels;
