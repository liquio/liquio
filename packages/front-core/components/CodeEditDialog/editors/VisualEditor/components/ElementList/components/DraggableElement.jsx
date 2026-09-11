import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { DragPreviewImage, useDrag, useDrop } from 'react-dnd';
import { Toolbar, Button } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import VisibilityIcon from '@mui/icons-material/Visibility';

import Icons from 'components/muiIcons';
import EditIcon from 'assets/icons/edit_icon.svg';
import previewImage from './dragImage';

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
  },
  editIconVisible: {
    opacity: 1
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
  moveSnippet,
  visualEditor
}) => {
  const button = React.useRef(null);

  const iconName = getSavedCode(element, 'icon');

  const IconComponent = iconName ? Icons[iconName] : null;

  const [{ handlerId }, drop] = useDrop({
    accept: ['control', 'function', 'container'],
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

      moveSnippet(dragIndex, hoverIndex);

      item.index = hoverIndex;
    }
  });

  const [{ isDragging }, drag, preview] = useDrag({
    item: {
      type: element?.type,
      defaultData: {
        ...element,
        description: element?.name
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const handleCLick = () => {
    setActiveSnippet(element);
    setCreateSnippet(true, element.type);
  };

  const highlightedSearch = (text) => {
    if (!search) {
      return text;
    }

    const index = text.toLowerCase().indexOf(search.toLowerCase());

    if (index === -1) {
      return text;
    }

    const before = text.slice(0, index);
    const highlighted = text.slice(index, index + search.length);
    const after = text.slice(index + search.length);

    return (
      <>
        {before}
        <mark>{highlighted}</mark>
        {after}
      </>
    );
  };

  drag(drop(button));

  const opacity = isDragging ? 0.5 : 1;

  return (
    <>
      <DragPreviewImage connect={preview} src={previewImage} />
      <Toolbar disableGutters={true} ref={button}>
        <Button
          ref={drag}
          data-handler-id={handlerId}
          fullWidth={true}
          style={{ opacity }}
          classes={{
            root: classes.root,
            label: classes.label
          }}
          onClick={handleCLick}
        >
          {iconName ? <IconComponent className={classes.icon} /> : null}
          {highlightedSearch(element?.name)}
          {!visualEditor ? (
            <>
              {readOnly ? (
                <VisibilityIcon className={classes.editIcon} />
              ) : (
                <img src={EditIcon} alt="edit icon" className={classes.editIcon} />
              )}
            </>
          ) : null}
        </Button>
      </Toolbar>
    </>
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
  moveSnippet: PropTypes.func,
  visualEditor: PropTypes.bool
};

DraggableElement.defaultProps = {
  setActiveSnippet: () => {},
  setCreateSnippet: () => {},
  moveSnippet: () => {},
  search: '',
  index: 0,
  readOnly: false,
  visualEditor: false
};

const styled = withStyles(styles)(DraggableElement);

export default translate('JsonSchemaEditor')(styled);
