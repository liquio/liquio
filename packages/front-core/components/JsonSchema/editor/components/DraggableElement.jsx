import React, { useEffect } from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { Toolbar, Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { useDraggable } from '@dnd-kit/core';
import VisibilityIcon from '@mui/icons-material/Visibility';

import Icons from 'components/muiIcons';
import EditIcon from 'assets/icons/edit_icon.svg';

const styles = {
  root: {
    justifyContent: 'flex-start',
    textAlign: 'left',
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
  icon: {
    marginRight: 8
  },
  editIcon: {
    position: 'absolute',
    right: 21,
    opacity: 0,
    fill: '#D0BCFF',
    color: '#D0BCFF',
    transition: 'opacity 0.25s ease-in-out'
  }
};

const getSavedCode = (code, key) => {
  try {
    const savedCode = JSON.parse(code.data);
    return savedCode[key] || '';
  } catch (e) {
    return '';
  }
};

const DraggableElement = ({
  classes,
  element,
  setActiveSnippet,
  setCreateSnippet,
  search,
  readOnly,
  index,
  setDraggingElement,
  visualEditor
}) => {
  const iconName = getSavedCode(element, 'icon');
  const IconComponent = iconName ? Icons[iconName] : null;

  const id = element?.id || `snippet-${index}`;

  const {
    setNodeRef: setDraggableRef,
    attributes,
    listeners,
    isDragging,
  } = useDraggable({
    id,
    data: {
      type: element?.type,
      index,
      element
    }
  });

  useEffect(() => {
    if (isDragging && setDraggingElement) {
      setDraggingElement(id);
    }
  }, [isDragging, element]);

  const handleClick = () => {
    setActiveSnippet(element);
    setCreateSnippet(true, element.type);
  };

  const highlightedSearch = (text) => {
    if (!search) return text;

    const i = text.toLowerCase().indexOf(search.toLowerCase());
    if (i === -1) return text;

    return (
      <>
        {text.slice(0, i)}
        <mark>{text.slice(i, i + search.length)}</mark>
        {text.slice(i + search.length)}
      </>
    );
  };

  const style = {
    opacity: 1,
    zIndex: isDragging ? 1000 : 'auto'
  };

  return (
    <Toolbar disableGutters ref={setDraggableRef} {...listeners} {...attributes} style={style}>
      <Button
        fullWidth
        classes={{
          root: classes.root,
          label: classes.label
        }}
        onClick={handleClick}
      >
        {iconName && <IconComponent className={classes.icon} />}
        {highlightedSearch(element?.name)}
        {!visualEditor &&
          (readOnly ? (
            <VisibilityIcon className={classes.editIcon} />
          ) : (
            <img src={EditIcon} alt="edit icon" className={classes.editIcon} />
          ))}
      </Button>
    </Toolbar>
  );
};

DraggableElement.propTypes = {
  classes: PropTypes.object.isRequired,
  element: PropTypes.object.isRequired,
  setActiveSnippet: PropTypes.func,
  setCreateSnippet: PropTypes.func,
  search: PropTypes.string,
  readOnly: PropTypes.bool,
  index: PropTypes.number,
  visualEditor: PropTypes.bool
};

DraggableElement.defaultProps = {
  setActiveSnippet: () => {},
  setCreateSnippet: () => {},
  search: '',
  index: 0,
  readOnly: false,
  visualEditor: false
};

const styled = withStyles(styles)(DraggableElement);

export default translate('JsonSchemaEditor')(styled);
