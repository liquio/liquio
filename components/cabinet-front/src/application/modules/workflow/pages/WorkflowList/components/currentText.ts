import React from 'react';
import { ReactComponent as ArchiveIcon } from 'assets/img/emptyScreens/archive.svg';
import { ReactComponent as DraftIcon } from 'assets/img/emptyScreens/draft.svg';

interface CurrentTextFilters {
  tasks?: { deleted?: boolean };
  is_draft?: boolean;
  [key: string]: unknown;
}

interface CurrentTextResult {
  title: string;
  description: string;
  Icon: React.ComponentType;
}

const currentText = (filters: CurrentTextFilters): CurrentTextResult => {
  const { tasks, is_draft } = filters;

  const texts: Record<string, CurrentTextResult> = {
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
