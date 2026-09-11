import { ReactComponent as ArchiveIcon } from 'assets/img/emptyScreens/archive.svg';
import { ReactComponent as DraftIcon } from 'assets/img/emptyScreens/draft.svg';

const currentText = (filters) => {
  const { tasks, is_draft } = filters;

  const texts = {
    drafts: {
      title: 'EmptyDraftsListTitle',
      description: 'EmptyDraftsListDescription',
      Icon: DraftIcon
    },
    trash: {
      title: 'EmptyTrashListTitle',
      description: 'EmptyTrashListDescription',
      Icon: ArchiveIcon
    },
    active: {
      title: 'EmptyListTitle',
      description: 'EmptyListDescription',
      Icon: DraftIcon
    }
  };

  if (tasks && tasks.deleted) return texts.trash;
  if (is_draft) return texts.drafts;

  return texts.active;
};

export default currentText;
