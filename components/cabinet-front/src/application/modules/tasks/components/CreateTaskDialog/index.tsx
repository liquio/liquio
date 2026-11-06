import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { IconButton, TextField } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import arrayToTree from 'array-to-tree';
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';
import sortArray from 'sort-array';

import { loadWorkflowCategories, loadWorkflowTemplates } from 'application/actions/workflow';
import TreeListRaw from 'components/TreeList';
import LeftSidebarLayout, { Content } from 'layouts/LeftSidebar';
import SelectEntryTaskDialogRaw from 'modules/tasks/components/CreateTaskDialog/SelectEntryTaskDialog';
import { history } from 'store';

const TreeList = TreeListRaw as unknown as React.ComponentType<Record<string, unknown>>;
const SelectEntryTaskDialog = SelectEntryTaskDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

type ThemeWithTaskSearch = {
  leftSidebarBg?: string;
  taskSearchInput?: { borderRadius?: number; borderActive?: string; border?: string; borderHover?: string };
  palette: { primary: { main: string } };
};

const styles = (theme: ThemeWithTaskSearch) => ({
  icon: {
    marginRight: 10
  },
  searchInput: {
    backgroundColor: theme.leftSidebarBg,
    borderRadius: theme?.taskSearchInput?.borderRadius || 40,
    marginBottom: 24,
    '& fieldset': {
      transition: 'border-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
      borderColor: 'transparent'
    },
    '& .MuiInputBase-root': {
      height: 40,
      borderRadius: theme?.taskSearchInput?.borderRadius || 40,
      '&.Mui-focused': {
        '& fieldset': {
          border: theme?.taskSearchInput?.borderActive
        }
      },
      '& fieldset': {
        border: theme?.taskSearchInput?.border || 'none'
      },
      '&:hover': {
        '& fieldset': {
          border: theme?.taskSearchInput?.borderHover || `2px solid ${theme?.palette?.primary?.main}`
        }
      }
    },
    '& .Mui-focused fieldset': {
      border: theme?.taskSearchInput?.borderActive || `2px solid ${theme?.palette?.primary?.main}`
    }
  }
});

interface WorkflowCategory {
  id: string | number;
  parentId?: string | number | null;
  workflowTemplateCategory?: { parentId?: string | number };
  [key: string]: unknown;
}

interface WorkflowTemplate {
  id: string | number;
  name?: string;
  isActive?: boolean;
  workflowTemplateCategoryId?: string | number;
  entryTaskTemplateIds?: { id: string | number; hidden?: boolean }[];
  [key: string]: unknown;
}

interface SelectItem {
  itemId?: string | number;
  parentId?: string | number;
  id?: string | number;
  description?: string;
  entryTaskTemplateIds?: { id: string | number; hidden?: boolean }[];
  items?: SelectItem[];
  [key: string]: unknown;
}

const categoryTree = (list: WorkflowCategory[], firstLevelId: string | number | null = null) =>
  arrayToTree(
    list.map((item) => ({
      ...item,
      parentId: item.parentId === firstLevelId ? 0 : item.parentId
    })),
    {
      customID: 'id',
      parentProperty: 'parentId',
      childrenProperty: 'items'
    }
  );

const templatesToSelectItems = ({ id, workflowTemplateCategoryId, name, ...rest }: WorkflowTemplate): SelectItem => ({
  ...rest,
  description: name,
  itemId: id,
  parentId: workflowTemplateCategoryId
});

const sortItems = (array: SelectItem[] | null): SelectItem[] | null => {
  if (!array) return null;

  const recursive = (arr: SelectItem[]) => {
    arr.forEach(({ items }) => {
      if (!items) return;

      sortArray(items, {
        by: 'trimmed',
        order: 'asc',
        computed: {
          trimmed: (item: SelectItem) => (item.description || '').trim() + ((item as WorkflowTemplate).name || '').trim()
        }
      } as never);

      recursive(items);
    });
  };

  recursive(array);

  return array;
};

interface CreateTaskDialogProps {
  templates: WorkflowTemplate[] | null;
  categories: WorkflowCategory[] | null;
  actions: {
    loadWorkflowTemplates: () => Promise<unknown>;
    loadWorkflowCategories: () => Promise<unknown>;
  };
  t: (key: string) => string;
  classes: Record<string, string>;
  loading?: boolean;
  location: unknown;
}

const CreateTaskDialog = ({ templates, categories, actions, t, classes, loading, location }: CreateTaskDialogProps) => {
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState<SelectItem | null>(null);

  React.useEffect(() => {
    const loadData = async () => {
      if (templates === null) await actions.loadWorkflowTemplates();
      if (categories === null) await actions.loadWorkflowCategories();
    };

    loadData();
  }, [templates, categories, actions]);

  const filterTemplate = ({ name }: WorkflowTemplate) => {
    const regex = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'gi');
    return regex.test(name as string);
  };

  const handleSearch = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => setSearch(value);

  const formTree = (): SelectItem[] | null => {
    if (templates === null || categories === null) return null;

    const filteredTemplates = templates
      .filter(({ isActive }) => isActive)
      .filter(
        ({ entryTaskTemplateIds }) =>
          Array.isArray(entryTaskTemplateIds) &&
          entryTaskTemplateIds.filter(({ hidden }) => !hidden).length
      );

    if (search.length) {
      return filteredTemplates.filter(filterTemplate).map(templatesToSelectItems);
    }

    const filteredCategories = categories.filter(
      ({ id }) =>
        filteredTemplates.some(
          ({ workflowTemplateCategoryId }) => workflowTemplateCategoryId === id
        ) ||
        categories.some(
          ({ parentId }) =>
            parentId === id &&
            filteredTemplates.some(
              ({ workflowTemplateCategory }) =>
                workflowTemplateCategory && (workflowTemplateCategory as { parentId?: unknown }).parentId === id
            )
        )
    );

    return categoryTree(
      ([] as (WorkflowCategory | SelectItem)[]).concat(filteredCategories, filteredTemplates.map(templatesToSelectItems)) as WorkflowCategory[]
    ) as unknown as SelectItem[];
  };

  const createLink = ({ id, itemId, entryTaskTemplateIds }: SelectItem): string | null => {
    if (id) {
      return null;
    }

    if (entryTaskTemplateIds && entryTaskTemplateIds.length) {
      if (entryTaskTemplateIds.filter(({ hidden }) => !hidden).length > 1) {
        return null;
      }
      return '/tasks/create/' + itemId + '/' + entryTaskTemplateIds[0].id;
    }

    return '/tasks/create/' + itemId;
  };

  const onKeyPress = ({ key }: React.KeyboardEvent) => {
    if (key !== 'Enter') {
      return;
    }

    const items = sortItems(formTree());
    if (!items || items.length !== 1) {
      return;
    }

    const [item] = items;
    history.push(createLink(item) as string);
  };

  const handleEntryPointSelect = (selected: SelectItem) => setSelected(selected);

  return (
    <LeftSidebarLayout location={location} title={t('SelectTemplate')} loading={loading}>
      <Content maxWidth={700}>
        <TextField
          autoFocus={true}
          onChange={handleSearch}
          value={search}
          fullWidth={true}
          {...({ autocomplete: 'off' } as unknown as Record<string, unknown>)}
          placeholder={t('SearchTemplate')}
          className={classes.searchInput}
          onKeyPress={onKeyPress}
          inputProps={{
            tabIndex: 0,
            'aria-label': t('SearchTemplate'),
            autocomplete: 'off'
          } as never}
          InputProps={{
            startAdornment: <SearchIcon className={classes.icon} />,
            endAdornment: search.length ? (
              <IconButton onClick={() => setSearch('')} size="small">
                <ClearOutlinedIcon />
              </IconButton>
            ) : null
          }}
        />

        <TreeList
          items={sortItems(formTree())}
          createLink={createLink}
          onChange={handleEntryPointSelect}
          isProcessesList={true}
        />

        <SelectEntryTaskDialog
          open={!!selected}
          template={selected}
          onClose={() => setSelected(null)}
        />
      </Content>
    </LeftSidebarLayout>
  );
};

interface ConnectedState {
  workflowTemplate: { list: WorkflowTemplate[] | null; categories: WorkflowCategory[] | null };
}

const mapStateToProps = ({ workflowTemplate }: ConnectedState) => ({
  templates: workflowTemplate.list,
  categories: workflowTemplate.categories
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    loadWorkflowTemplates: bindActionCreators(loadWorkflowTemplates, dispatch),
    loadWorkflowCategories: bindActionCreators(loadWorkflowCategories, dispatch)
  }
});

const translated = translate('CreateTaskDialog')(CreateTaskDialog as never);
export default withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(translated as never) as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
