import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

export default function getUserShortName(member) {
  let shortName = '';
  if (member.last_name) {
    shortName += capitalizeFirstLetter(member.last_name);
  }

  if (member.first_name || member.middle_name) {
    shortName += ' ';
  }

  if (member.first_name) {
    shortName += member.first_name.charAt(0) + '.';
  }

  if (member.middle_name) {
    shortName += member.middle_name.charAt(0) + '.';
  }

  return shortName;
}
