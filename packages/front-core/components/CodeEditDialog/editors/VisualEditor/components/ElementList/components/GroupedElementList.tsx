import React from 'react';
import { translate } from 'react-translate';
import classNames from 'classnames';
import sortArray from 'sort-array';
import update from 'immutability-helper';
import { DragPreviewImage, useDrag, useDrop, type DropTargetMonitor, type DragSourceMonitor } from 'react-dnd';
import { Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import VisibilityIcon from '@mui/icons-material/Visibility';

import EditIcon from 'assets/icons/edit_icon.svg';
import storage from 'helpers/storage';
import { withEditor } from './../../../JsonSchemaProvider';
import DraggableElement from './DraggableElement';
import previewImage from './dragImage';

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
    fontStyle: 'normal' as const,
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

interface Snippet {
  name: string;
  type?: string;
  key?: string;
  data?: string;
  id?: string;
  snippetGroup?: { name: string };
  [key: string]: unknown;
}

interface Group {
  name: string;
  [key: string]: unknown;
}

interface GroupContainerProps {
  classes: Record<string, string>;
  handleOpenGroup: (group: string) => void;
  group: string;
  readOnly?: boolean;
  filteredSnippets: Snippet[];
  moveSnippet: (dragIndex: number, hoverIndex: number) => void;
  search: string;
  setActiveSnippet: (snippet: Snippet) => void;
  handleOpenCreateSnippet: (open: boolean, type?: string) => void;
  moveGroup: (dragIndex: number, hoverIndex: number) => void;
  index: number;
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
  moveGroup,
  index,
  visualEditor
}: GroupContainerProps) => {
  const button = React.useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: ['group'],
    collect(monitor: DropTargetMonitor) {
      return {
        handlerId: monitor.getHandlerId()
      };
    },
    hover(item: { index: number }, monitor: DropTargetMonitor) {
      if (!button.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = button.current?.getBoundingClientRect();

      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      const clientOffset = monitor.getClientOffset();

      const hoverClientY = (clientOffset as { y: number }).y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveGroup(dragIndex, hoverIndex);

      item.index = hoverIndex;
    }
  } as never) as unknown as [{ handlerId: string | symbol | null }, (node: HTMLElement | null) => void];

  const [{ isDragging }, drag, preview] = useDrag({
    item: {
      type: 'group'
    },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging()
    })
  } as never) as unknown as [
    { isDragging: boolean },
    (node: HTMLElement | null) => void,
    (node: unknown) => void
  ];

  (drag as (node: unknown) => void)(drop(button as never));

  const opacity = isDragging ? 0.5 : 1;

  return (
    <>
      {group ? (
        <>
          <DragPreviewImage connect={preview as never} src={previewImage} />
          <div ref={button}>
            <Button
              ref={drag as never}
              data-handler-id={handlerId}
              fullWidth={true}
              style={{ opacity }}
              classes={classes as never}
              onClick={() => handleOpenGroup(group)}
            >
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
        </>
      ) : null}

      {filteredSnippets.map((element, index) => (
        <DraggableElement
          index={index}
          moveSnippet={moveSnippet}
          search={search}
          readOnly={readOnly}
          element={element}
          key={element.name}
          setActiveSnippet={setActiveSnippet}
          setCreateSnippet={handleOpenCreateSnippet}
          visualEditor={visualEditor}
        />
      ))}
    </>
  );
};

interface GroupedElementListProps {
  t?: (key: string) => string;
  classes: Record<string, string>;
  groups?: Group[];
  setActiveGroup?: (group: Group | undefined) => void;
  setOpenGroup?: (open: boolean) => void;
  handleOpenCreateSnippet?: (open: boolean, type?: string) => void;
  snippets?: Snippet[];
  search?: string;
  setActiveSnippet?: (snippet: Snippet) => void;
  readOnly?: boolean;
  visualEditor?: boolean;
}

const GroupedElementList = ({
  classes,
  groups = [],
  setActiveGroup = () => {},
  setOpenGroup = () => {},
  handleOpenCreateSnippet = () => {},
  snippets = [],
  search = '',
  setActiveSnippet = () => {},
  readOnly = false,
  visualEditor = false
}: GroupedElementListProps) => {
  const [sort, setSort] = React.useState<Record<string, Snippet[]>>(() => {
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

  const handleSortSnippets = (group: string, elements: Snippet[]) => {
    const newSort = {
      ...sort,
      [group]: elements
    };

    setSort(newSort);

    storage.setItem('sortSnippets', JSON.stringify(newSort));
  };

  const snippetGroups = (snippets || []).reduce((acc: Record<string, Snippet[]>, snippet) => {
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

  sortArray(sortedGroups, {
    by: 'sortIndex',
    order: 'asc'
  });

  const renderGroupedSnippets = (name: string) => (
    <>
      {sortedGroups.map(({ name: group, elements }, index) => {
        const filteredSnippets = (elements as Snippet[])
          .map((item) => ({
            ...item,
            sortIndex:
              (sort[group as string] || [])?.findIndex((element) => (element || {} as Snippet).id === item.id) || 0
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
          by: 'sortIndex',
          order: 'asc'
        });

        return (
          <GroupContainer
            index={index}
            key={index}
            classes={classes}
            handleOpenGroup={handleOpenGroup}
            group={group as string}
            readOnly={readOnly}
            filteredSnippets={filteredSnippets}
            moveSnippet={moveSnippet}
            moveGroup={moveGroup}
            search={search}
            setActiveSnippet={setActiveSnippet}
            handleOpenCreateSnippet={handleOpenCreateSnippet}
            visualEditor={visualEditor}
          />
        );
      })}
    </>
  );

  return (
    <>
      {renderGroupedSnippets('function')}
      {renderGroupedSnippets('control')}
      {renderGroupedSnippets('container')}

      <div className={classes.divider} />
    </>
  );
};

const styled = withStyles(styles)(GroupedElementList as never);
const translated = translate('JsonSchemaEditor')(styled as never);
export default withEditor(translated as unknown as React.ComponentType<Record<string, unknown>>);
