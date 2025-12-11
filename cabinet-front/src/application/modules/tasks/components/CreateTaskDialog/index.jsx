import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { IconButton, TextField } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import arrayToTree from 'array-to-tree';
import React from 'react';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import sortArray from 'sort-array';

import { loadWorkflowCategories, loadWorkflowTemplates } from 'application/actions/workflow';
import TreeList from 'components/TreeList';
import LeftSidebarLayout, { Content } from 'layouts/LeftSidebar';
import SelectEntryTaskDialog from 'modules/tasks/components/CreateTaskDialog/SelectEntryTaskDialog';
import { history } from 'store';

const styles = (theme) => ({
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
          border: theme?.taskSearchInput?.borderHover || '2px solid #0068FF'
        }
      }
    },
    '& .Mui-focused fieldset': {
      border: '2px solid #0068FF'
    }
  }
});

const categoryTree = (list, firstLevelId = null) =>
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

const templatesToSelectItems = ({ id, workflowTemplateCategoryId, name, ...rest }) => ({
  ...rest,
  description: name,
  itemId: id,
  parentId: workflowTemplateCategoryId
});

const sortItems = (array) => {
  if (!array) return null;

  const recursive = (arr) => {
    arr.forEach(({ items }) => {
      if (!items) return;

      sortArray(items, {
        by: 'trimmed',
        order: 'asc',
        computed: {
          trimmed: (item) => (item.description || '').trim() + (item.name || '').trim()
        }
      });

      recursive(items);
    });
  };

  recursive(array);

  return array;
};

const CreateTaskDialog = ({ templates, categories, actions, t, classes, loading, location }) => {
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState(null);

  React.useEffect(() => {
    const loadData = async () => {
      if (templates === null) await actions.loadWorkflowTemplates();
      if (categories === null) await actions.loadWorkflowCategories();
    };

    loadData();
  }, [templates, categories, actions]);

  const filterTemplate = ({ name }) => {
    const regex = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'gi');
    return regex.test(name);
  };

  const handleSearch = ({ target: { value } }) => setSearch(value);

  const formTree = () => {
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
                workflowTemplateCategory && workflowTemplateCategory.parentId === id
            )
        )
    );

    return categoryTree(
      [].concat(filteredCategories, filteredTemplates.map(templatesToSelectItems))
    );
  };

  const createLink = ({ id, itemId, entryTaskTemplateIds }) => {
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

  const onKeyPress = ({ key }) => {
    if (key !== 'Enter') {
      return;
    }

    const items = sortItems(formTree());
    if (items.length !== 1) {
      return;
    }

    const [item] = items;
    history.push(createLink(item));
  };

  const handleEntryPointSelect = (selected) => setSelected(selected);

  return (
    <LeftSidebarLayout location={location} title={t('SelectTemplate')} loading={loading}>
      <Content maxWidth={700}>
        <TextField
          autoFocus={true}
          onChange={handleSearch}
          value={search}
          fullWidth={true}
          autocomplete="off"
          placeholder={t('SearchTemplate')}
          className={classes.searchInput}
          onKeyPress={onKeyPress}
          inputProps={{
            tabIndex: 0,
            'aria-label': t('SearchTemplate'),
            autocomplete: 'off'
          }}
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

const mapStateToProps = ({ workflowTemplate }) => ({
  templates: workflowTemplate.list,
  categories: workflowTemplate.categories
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    loadWorkflowTemplates: bindActionCreators(loadWorkflowTemplates, dispatch),
    loadWorkflowCategories: bindActionCreators(loadWorkflowCategories, dispatch)
  }
});

const translated = translate('CreateTaskDialog')(CreateTaskDialog);
export default withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(translated));
