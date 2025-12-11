import { translate } from 'react-translate';

const OperationType = ({ t, type }) => {
  const operation = type.indexOf('added-to') >= 0 ? 'AddedTo' : 'DeletedFrom';
  const memberType = type.indexOf('head-unit') >= 0 ? 'Heads' : 'Members';

  return [t(operation), t(memberType)].join(' ');
};

export default translate('UserAccessJournalPage')(OperationType);
