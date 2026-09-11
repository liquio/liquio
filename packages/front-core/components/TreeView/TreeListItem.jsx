import React from 'react';

import { Collapse, ListItem, ListItemIcon, ListItemText } from '@mui/material';

import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import DetailsOutlinedIcon from '@mui/icons-material/DetailsOutlined';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import TreeViewList from './TreeViewList';

const defaultRender = (value, key) => key;

const TreeListItem = ({ itemKey, item, ...rest }) => {
  const {
    path,
    classes,
    onClick = () => null,
    render = defaultRender,
    ChildIcon = DetailsOutlinedIcon,
    ParentIcon = FolderOutlinedIcon,
  } = rest;

  const isParent = typeof item === 'object';

  const [open, setOpen] = React.useState(false);

  return (
    <>
      <ListItem
        button
        onClick={(e) => (isParent ? setOpen(!open) : onClick(e, item, path))}
        className={isParent ? classes?.parent : classes?.child}
      >
        <ListItemIcon>{isParent ? <ParentIcon /> : <ChildIcon />}</ListItemIcon>
        <ListItemText primary={render(item, itemKey)} />
        {isParent ? open ? <ExpandLess /> : <ExpandMore /> : null}
      </ListItem>
      {isParent ? (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <div style={{ marginLeft: 32 }}>
            <TreeViewList {...rest} list={item} />
          </div>
        </Collapse>
      ) : null}
    </>
  );
};

export default TreeListItem;
