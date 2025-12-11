import React from 'react';
import { translate } from 'react-translate';
import classNames from 'classnames';
import sortArray from 'sort-array';
import update from 'immutability-helper';
import PropTypes from 'prop-types';
import { DragPreviewImage, useDrag, useDrop } from 'react-dnd';
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
    position: 'relative',
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
    textTransform: 'inherit',
    fontSize: '14px',
    lineHeight: '20px',
    letterSpacing: '0.1px',
    color: '#CAC4D0',
    borderRadius: 30,
    padding: 16,
    position: 'relative',
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
    position: 'absolute',
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
}) => {
  const button = React.useRef(null);

  const [{ handlerId }, drop] = useDrop({
    accept: ['group'],
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId()
      };
    },
    hover(item, monitor) {
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

      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveGroup(dragIndex, hoverIndex);

      item.index = hoverIndex;
    }
  });

  const [{ isDragging }, drag, preview] = useDrag({
    item: {
      type: 'group'
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  drag(drop(button));

  const opacity = isDragging ? 0.5 : 1;

  return (
    <>
      {group ? (
        <>
          <DragPreviewImage connect={preview} src={previewImage} />
          <div ref={button}>
            <Button
              ref={drag}
              data-handler-id={handlerId}
              fullWidth={true}
              style={{ opacity }}
              classes={classes}
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

const GroupedElementList = ({
  classes,
  groups,
  setActiveGroup,
  setOpenGroup,
  handleOpenCreateSnippet,
  snippets,
  search,
  setActiveSnippet,
  readOnly,
  visualEditor
}) => {
  const [sort, setSort] = React.useState(() => {
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

  const [sortGroups, setSortGroups] = React.useState(() => {
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

  const handleOpenGroup = (group) => {
    setActiveGroup(groups.find((item) => item.name === group));
    setOpenGroup(true);
  };

  const handleSortGroups = (elements) => {
    setSortGroups(elements);
    storage.setItem('sortGroups', JSON.stringify(elements));
  };

  const handleSortSnippets = (group, elements) => {
    const newSort = {
      ...sort,
      [group]: elements
    };

    setSort(newSort);

    storage.setItem('sortSnippets', JSON.stringify(newSort));
  };

  const snippetGroups = (snippets || []).reduce((acc, snippet) => {
    const group = snippet?.snippetGroup?.name;
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

  const renderGroupedSnippets = (name) => (
    <>
      {sortedGroups.map(({ name: group, elements }, index) => {
        const filteredSnippets = elements
          .map((item) => ({
            ...item,
            sortIndex:
              (sort[group] || [])?.findIndex((element) => (element || {}).id === item.id) || 0
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

        const moveSnippet = (dragIndex, hoverIndex) => {
          const result = update(filteredSnippets, {
            $splice: [
              [dragIndex, 1],
              [hoverIndex, 0, filteredSnippets[dragIndex]]
            ]
          });

          handleSortSnippets(group, result);
        };

        const moveGroup = (dragIndex, hoverIndex) => {
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
            group={group}
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

GroupedElementList.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  groups: PropTypes.array,
  setActiveGroup: PropTypes.func,
  setOpenGroup: PropTypes.func,
  handleOpenCreateSnippet: PropTypes.func,
  snippets: PropTypes.array,
  search: PropTypes.string,
  setActiveSnippet: PropTypes.func,
  readOnly: PropTypes.bool,
  visualEditor: PropTypes.bool
};

GroupedElementList.defaultProps = {
  groups: [],
  setActiveGroup: () => {},
  setOpenGroup: () => {},
  handleOpenCreateSnippet: () => {},
  snippets: [],
  search: '',
  setActiveSnippet: () => {},
  readOnly: false,
  visualEditor: false
};

const styled = withStyles(styles)(GroupedElementList);
const translated = translate('JsonSchemaEditor')(styled);
export default withEditor(translated);
