import React from 'react';

import { Collapse, ListItem, ListItemIcon, ListItemText } from '@mui/material';

import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import DetailsOutlinedIcon from '@mui/icons-material/DetailsOutlined';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import TreeViewList from './TreeViewList';

const defaultRender = (value: unknown, key: string) => key;

export interface TreeViewRest {
  path?: string[];
  classes?: { parent?: string; child?: string };
  onClick?: (event: React.SyntheticEvent, item: unknown, path?: string[]) => void;
  render?: (value: unknown, key: string) => React.ReactNode;
  ChildIcon?: React.ComponentType;
  ParentIcon?: React.ComponentType;
  [key: string]: unknown;
}

interface TreeListItemProps extends TreeViewRest {
  itemKey: string;
  item: unknown;
}

const TreeListItem = ({ itemKey, item, ...rest }: TreeListItemProps) => {
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
        {...({ button: true } as unknown as Record<string, unknown>)}
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
            <TreeViewList {...rest} list={item as Record<string, unknown>} />
          </div>
        </Collapse>
      ) : null}
    </>
  );
};

export default TreeListItem;
