import { ReactComponent as Icon } from 'assets/img/emptyScreens/tasks.svg';
import { ReactComponent as ArchiveIcon } from 'assets/img/emptyScreens/archive.svg';

const getTexts = (t, finished, assigned_to) => {
  if (finished && assigned_to === 'me') {
    return {
      title: t('EmptyListTitleArchive'),
      description: t('EmptyListDescriptionArchive'),
      Icon: ArchiveIcon
    };
  }

  if (finished && assigned_to === 'unit') {
    return {
      title: t('EmptyListTitleArchiveUnit'),
      description: t('EmptyListDescriptionArchiveUnit'),
      Icon: ArchiveIcon
    };
  }

  if (assigned_to === 'me') {
    return {
      title: t('EmptyListTitle'),
      description: t('EmptyListDescription'),
      Icon: Icon
    };
  }

  if (assigned_to === 'unit') {
    return {
      title: t('EmptyListTitleAssignedUnit'),
      description: t('EmptyListDescriptionAssignedUnit'),
      Icon: Icon
    };
  }

  return {
    title: t('EmptyListTitle'),
    description: t('EmptyListDescription'),
    Icon: Icon
  };
};

export default getTexts;
