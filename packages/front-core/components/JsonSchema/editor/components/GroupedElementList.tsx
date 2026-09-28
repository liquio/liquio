import React from 'react';
import { translate } from 'react-translate';
import classNames from 'classnames';
import sortArray from 'sort-array';
import update from 'immutability-helper';
import { Tooltip, IconButton, Typography, Button } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { DragOverlay } from '@dnd-kit/core';

import EditIcon from 'assets/icons/edit_icon.svg';
import storage from 'helpers/storage';
import DraggableElementTyped from './DraggableElement';

// `DraggableElement`'s own `SnippetElement`/prop shapes are declared
// separately from this file's locally-declared equivalents (structurally
// similar but nominally distinct interfaces of the same name), and this
// file also passes a couple of extra props (`moveSnippet`, `draggingElement`)
// that `DraggableElement` never destructures — loosened to a generic
// component type here rather than reconciling the two independent shapes.
const DraggableElement = DraggableElementTyped as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  divider: {
    flexGrow: 1,
    height: 1,
    background: '#49454F',
    marginLeft: 20,
    marginRight: 20,
    marginTop: 5,
    marginBottom: 5
  },
  actionsWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 10,
    paddingLeft: 20,
    minHeight: 52,
    '&:hover': {
      backgroundColor: 'rgba(187, 134, 252, 0.08)'
    }
  },
  groupName: {
    color: '#CAC4D0',
    position: 'relative' as const,
    fontSize: 14,
    lineHeight: '20px',
    cursor: 'pointer',
    paddingBottom: 17,
    paddingTop: 17,
    width: '100%'
  },
  iconButton: {
    padding: 8
  },
  root: {
    justifyContent: 'flex-start',
    marginLeft: 5,
    marginRight: 5,
    textTransform: 'inherit' as const,
    fontSize: '14px',
    lineHeight: '20px',
    letterSpacing: '0.1px',
    color: '#CAC4D0',
    borderRadius: 30,
    padding: 16,
    position: 'relative' as const,
    width: 'calc(100% - 10px)',
    '&:hover': {
      '& img': {
        opacity: 1
      },
      '& svg': {
        opacity: 1
      }
    }
  },
  label: {
    justifyContent: 'flex-start'
  },
  editIcon: {
    position: 'absolute' as const,
    right: 21,
    opacity: 0,
    fill: '#D0BCFF',
    color: '#D0BCFF',
    transition: 'opacity 0.25s ease-in-out'
  },
  headline: {
    cursor: 'pointer',
    fontStyle: 'normal',
    fontWeight: 500,
    fontSize: 14,
    lineHeight: '20px',
    letterSpacing: '0.1px',
    color: '#CAC4D0',
    paddingTop: 6,
    paddingBottom: 6,
    display: 'block',
    width: '100%'
  }
};

interface SnippetElement {
  id?: string;
  name: string;
  type?: string;
  data: string;
  snippetGroup?: { name?: string };
  sortIndex?: number;
  [key: string]: unknown;
}

interface GroupContainerProps {
  classes: Record<string, string>;
  handleOpenGroup: (group: string) => void;
  group?: string;
  readOnly?: boolean;
  filteredSnippets: SnippetElement[];
  moveSnippet: (dragIndex: number, hoverIndex: number) => void;
  search: string;
  setActiveSnippet: (snippet: SnippetElement) => void;
  handleOpenCreateSnippet: (bool: boolean, type?: string) => void;
  draggingElement?: unknown;
  setDraggingElement: (element: unknown) => void;
  visualEditor?: boolean;
}

const GroupContainer = ({
  classes,
  handleOpenGroup,
  group,
  readOnly,
  filteredSnippets,
  moveSnippet,
  search,
  setActiveSnippet,
  handleOpenCreateSnippet,
  draggingElement,
  setDraggingElement,
  visualEditor
}: GroupContainerProps) => {
  const button = React.useRef(null);

  return (
    <>
      {group ? (
        <div ref={button}>
          <Button fullWidth={true} classes={classes} onClick={() => handleOpenGroup(group)}>
            {group}
            {!visualEditor ? (
              <>
                {readOnly ? (
                  <VisibilityIcon
                    className={classNames({
                      [classes.editIcon]: true
                    })}
                  />
                ) : (
                  <img
                    src={EditIcon}
                    alt="edit icon"
                    className={classNames({
                      [classes.editIcon]: true
                    })}
                  />
                )}
              </>
            ) : null}
          </Button>
        </div>
      ) : null}

      {filteredSnippets.map((element) => (
        <DraggableElement
          index={-1}
          moveSnippet={moveSnippet}
          search={search}
          readOnly={readOnly}
          element={element}
          key={element.name}
          setActiveSnippet={setActiveSnippet}
          draggingElement={draggingElement}
          setDraggingElement={setDraggingElement}
          setCreateSnippet={handleOpenCreateSnippet}
          visualEditor={visualEditor}
        />
      ))}
    </>
  );
};

interface Group {
  name: string;
  [key: string]: unknown;
}

interface GroupedElementListProps extends WithStyles<typeof styles> {
  t: (key: string) => string;
  groups?: Group[];
  setActiveGroup: (group: Group | undefined) => void;
  setOpenGroup: (open: boolean) => void;
  handleOpenCreateSnippet: (bool: boolean, type?: string) => void;
  draggingElement?: unknown;
  setDraggingElement: (element: unknown) => void;
  snippets?: SnippetElement[];
  search?: string;
  setActiveSnippet: (snippet: SnippetElement) => void;
  readOnly?: boolean;
  visualEditor?: boolean;
}

const GroupedElementList = ({
  t,
  classes,
  groups = [],
  setActiveGroup,
  setOpenGroup,
  handleOpenCreateSnippet,
  draggingElement,
  setDraggingElement,
  snippets = [],
  search = '',
  setActiveSnippet,
  readOnly = false,
  visualEditor = false
}: GroupedElementListProps) => {
  const [openAddition, setOpenAddition] = React.useState(
    storage.getItem('openAddition') === 'true'
  );
  const [openControl, setOpenControl] = React.useState(storage.getItem('openControl') === 'true');
  const [openContainer, setOpenContainer] = React.useState(
    storage.getItem('openContainer') === 'true'
  );
  const [sort, setSort] = React.useState<Record<string, SnippetElement[]>>(() => {
    try {
      const savedSort = storage.getItem('sortSnippets');

      if (!savedSort) {
        return {};
      }

      const data = JSON.parse(savedSort);

      return data || {};
    } catch {
      return {};
    }
  });
  const [sortGroups, setSortGroups] = React.useState<string[]>(() => {
    try {
      const savedSort = storage.getItem('sortGroups');

      if (!savedSort) {
        return [];
      }

      const data = JSON.parse(savedSort);

      return data || [];
    } catch {
      return [];
    }
  });

  const handleOpenGroup = (group: string) => {
    setActiveGroup(groups.find((item) => item.name === group));
    setOpenGroup(true);
  };

  const handleSortGroups = (elements: string[]) => {
    setSortGroups(elements);
    storage.setItem('sortGroups', JSON.stringify(elements));
  };

  const handleSortSnippets = (group: string, elements: SnippetElement[]) => {
    const newSort = {
      ...sort,
      [group]: elements
    };

    setSort(newSort);

    storage.setItem('sortSnippets', JSON.stringify(newSort));
  };

  const snippetGroups = (snippets || []).reduce((acc: Record<string, SnippetElement[]>, snippet) => {
    const group = snippet?.snippetGroup?.name as string;
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(snippet);
    return acc;
  }, {});

  const sortedGroups = Object.keys(snippetGroups).map((group) => {
    return {
      ...groups.find((item) => item.name === group),
      elements: snippetGroups[group],
      sortIndex: (sortGroups || []).findIndex((element) => element === group) || 0
    };
  });

  const allElements = sortedGroups.reduce((acc: SnippetElement[], group) => {
    return [...acc, ...group.elements];
  }, []);

  sortArray(sortedGroups, {
    by: ['sortIndex'],
    order: ['asc']
  });

  const renderGroupedSnippets = (name: string) => (
    <>
      {sortedGroups.map(({ name: group, elements }, index) => {
        const filteredSnippets = elements
          .map((item) => ({
            ...item,
            sortIndex:
              (sort[group as string] || [])?.findIndex((element) => (element || {}).id === item.id) || 0
          }))
          .filter((snippet) => snippet?.type === name)
          .filter((element) => {
            const nameMatch = (element?.name).toLowerCase().includes(search.toLowerCase());
            const codeMatch = JSON.stringify(element).toLowerCase().includes(search.toLowerCase());
            return nameMatch || codeMatch;
          });

        if (!(filteredSnippets || []).length) {
          return null;
        }

        const moveSnippet = (dragIndex: number, hoverIndex: number) => {
          const result = update(filteredSnippets, {
            $splice: [
              [dragIndex, 1],
              [hoverIndex, 0, filteredSnippets[dragIndex]]
            ]
          });

          handleSortSnippets(group as string, result);
        };

        const moveGroup = (dragIndex: number, hoverIndex: number) => {
          const group = Object.keys(snippetGroups);

          const result = update(group, {
            $splice: [
              [dragIndex, 1],
              [hoverIndex, 0, group[dragIndex]]
            ]
          });

          handleSortGroups(result);
        };

        sortArray(filteredSnippets, {
          by: ['sortIndex'],
          order: ['asc']
        });

        return (
          <GroupContainer
            key={index}
            classes={classes}
            handleOpenGroup={handleOpenGroup}
            draggingElement={draggingElement}
            setDraggingElement={setDraggingElement}
            group={group}
            readOnly={readOnly}
            filteredSnippets={filteredSnippets}
            moveSnippet={moveSnippet}
            search={search}
            setActiveSnippet={setActiveSnippet}
            handleOpenCreateSnippet={handleOpenCreateSnippet}
            visualEditor={visualEditor}
            {...({ index, moveGroup } as unknown as Record<string, unknown>)}
          />
        );
      })}
    </>
  );

  return (
    <>
      <div className={classes.actionsWrapper}>
        <Typography
          className={classes.headline}
          onClick={() => {
            setOpenAddition(!openAddition);
            storage.setItem('openAddition', String(!openAddition));
          }}
        >
          {t('AdditionsFunctions')}
        </Typography>

        {readOnly ? null : (
          <Tooltip title={t('AddSnippet')}>
            <IconButton
              onClick={() => handleOpenCreateSnippet(true, 'function')}
              classes={{ root: classes.iconButton }}
            >
              <AddIcon className={(classes as Record<string, string>).icon} />
            </IconButton>
          </Tooltip>
        )}
      </div>

      {openAddition || (search || '').length ? renderGroupedSnippets('function') : null}

      <div className={classes.actionsWrapper}>
        <Typography
          className={classes.headline}
          onClick={() => {
            setOpenControl(!openControl);
            storage.setItem('openControl', String(!openControl));
          }}
        >
          {t('Controls')}
        </Typography>

        {readOnly ? null : (
          <Tooltip title={t('AddSnippet')}>
            <IconButton
              onClick={() => handleOpenCreateSnippet(true, 'control')}
              classes={{ root: classes.iconButton }}
            >
              <AddIcon className={(classes as Record<string, string>).icon} />
            </IconButton>
          </Tooltip>
        )}
      </div>

      {openControl || (search || '').length ? renderGroupedSnippets('control') : null}

      <div className={classes.actionsWrapper}>
        <Typography
          className={classes.headline}
          onClick={() => {
            setOpenContainer(!openContainer);
            storage.setItem('openContainer', String(!openContainer));
          }}
        >
          {t('Containers')}
        </Typography>

        {readOnly ? null : (
          <Tooltip title={t('AddSnippet')}>
            <IconButton
              onClick={() => handleOpenCreateSnippet(true, 'container')}
              classes={{ root: classes.iconButton }}
            >
              <AddIcon className={(classes as Record<string, string>).icon} />
            </IconButton>
          </Tooltip>
        )}
      </div>

      {openContainer || (search || '').length ? renderGroupedSnippets('container') : null}

      <DragOverlay>
        {draggingElement ? (
          <DraggableElement
            index={-1}
            moveSnippet={() => {}}
            element={allElements.find((item) => item.id === draggingElement)}
            visualEditor={visualEditor}
          />
        ) : null}
      </DragOverlay>
      <div className={classes.divider} />
    </>
  );
};

const styled = withStyles(styles)(GroupedElementList);
export default translate('JsonSchemaEditor')(styled as never) as unknown as React.ComponentType<Record<string, unknown>>;
