import React from 'react';
import { translate } from 'react-translate';
import classNames from 'classnames';
import sortArray from 'sort-array';
import update from 'immutability-helper';
import PropTypes from 'prop-types';
import { Tooltip, IconButton, Typography, Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { DragOverlay } from '@dnd-kit/core';

import EditIcon from 'assets/icons/edit_icon.svg';
import storage from 'helpers/storage';
import DraggableElement from './DraggableElement';

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
  draggingElement,
  setDraggingElement,
  visualEditor
}) => {
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

const GroupedElementList = ({
  t,
  classes,
  groups,
  setActiveGroup,
  setOpenGroup,
  handleOpenCreateSnippet,
  draggingElement,
  setDraggingElement,
  snippets,
  search,
  setActiveSnippet,
  readOnly,
  visualEditor
}) => {
  const [openAddition, setOpenAddition] = React.useState(
    storage.getItem('openAddition') === 'true'
  );
  const [openControl, setOpenControl] = React.useState(storage.getItem('openControl') === 'true');
  const [openContainer, setOpenContainer] = React.useState(
    storage.getItem('openContainer') === 'true'
  );
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

  const allElements = sortedGroups.reduce((acc, group) => {
    return [...acc, ...group.elements];
  }, []);

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
            draggingElement={draggingElement}
            setDraggingElement={setDraggingElement}
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
      <div className={classes.actionsWrapper}>
        <Typography
          className={classes.headline}
          onClick={() => {
            setOpenAddition(!openAddition);
            storage.setItem('openAddition', !openAddition);
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
              <AddIcon className={classes.icon} />
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
            storage.setItem('openControl', !openControl);
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
              <AddIcon className={classes.icon} />
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
            storage.setItem('openContainer', !openContainer);
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
              <AddIcon className={classes.icon} />
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
export default translate('JsonSchemaEditor')(styled);
