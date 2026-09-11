import React from 'react';
import { NavLink } from 'react-router-dom';
import classNames from 'classnames';
import {
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import TreeList from 'components/TreeList';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import { ReactComponent as ItemIcon } from 'assets/img/tree-list-icon.svg';
import { ReactComponent as FolderIcon } from './assets/folder.svg';
import { ReactComponent as OpenedFolder } from './assets/opened_folder.svg';
import { ReactComponent as LinkIcon } from './assets/link.svg';

export const styles = (theme) => ({
  nested: {
    borderRadius: '0 0 8px 8px',
    borderRight: '1px solid #A9ACAA',
    borderBottom: '1px solid #A9ACAA',
    borderLeft: '1px solid #A9ACAA',
    background: theme.leftSidebarBg,
    marginBottom: 8,
    paddingTop: 12,
    paddingBottom: 12,
  },
  nestedIcon: {
    display: 'none',
  },
  item: {
    borderRadius: 8,
    border: '1px solid #A9ACAA',
    background: '#FFF',
    marginBottom: 8,
    padding: '7px 18px',
    paddingRight: 16,
  },
  registerSelectItem: {
    paddingLeft: 12,
  },
  openedItem: {
    borderBottom: 'none',
    marginBottom: 0,
    borderRadius: '8px 8px 0 0',
  },
  nestedItem: {
    marginBottom: 0,
    background: theme.leftSidebarBg,
    padding: 0,
    paddingLeft: 64,
    borderRadius: 0,
    paddingRight: 16,
    border: 'none',
    '&:hover': {
      background: theme.nestedItem || theme.categoryWrapperActive,
    },
  },
  processControlNestedItem: {
    border: 'none',
    borderRadius: 0,
  },
  mobileIcon: {
    [theme.breakpoints.down('md')]: {
      display: 'none',
    },
  },
  navLink: {
    textDecoration: 'none',
    color: '#000',
    borderRadius: 8,
    '&:focus-within': {
      outlineOffset: 0,
      display: 'block',
      borderRadius: 0,
      outline: `${theme.outlineColor} solid 3px`,
    },
  },
  registerSelectIcon: {
    display: 'none',
  },
  registerSelectNested: {
    borderLeft: '1px solid rgba(0, 0, 0, 0.20)',
    backgroundColor: '#fff',
  },
  registerSelectNestedItem: {
    backgroundColor: '#fff',
    paddingLeft: 0,
    marginLeft: 16,
  },
  listItemIconRoot: {
    color: '#000',
    minWidth: 'unset',
    marginRight: 4,
  },
  firstLevelItem: {
    marginLeft: 44,
  },
});

const TreeListItem = ({
  item,
  onClick,
  onMenuOpen,
  createLink,
  classes,
  link,
  id,
  isProcessesList,
  nested,
  isProcessControl,
  registerSelect,
}) => {
  const [open, setOpen] = React.useState(false);
  const { description, name, items, stringified } = item;

  const handleClick = React.useCallback(() => {
    if (item.items) {
      setOpen((prevOpen) => !prevOpen);
      onMenuOpen && onMenuOpen();
    } else {
      onClick && onClick(item);
    }
  }, [onMenuOpen, onClick, item]);

  const itemId = React.useMemo(() => id + '-item', [id]);

  const icon = isProcessesList ? <ItemIcon /> : <FolderIcon />;
  const linkIcon = isProcessesList ? <ItemIcon /> : <LinkIcon />;
  const openedFolderIcon = isProcessesList ? <ItemIcon /> : <OpenedFolder />;

  const primary = description || name || stringified;

  if (link) {
    return (
      <NavLink id={itemId} to={link} className={classes.navLink}>
        <ListItemButton
          tabIndex={-1}
          className={classNames({
            [classes.item]: true,
            [classes.openedItem]: open,
            [classes.nestedItem]: nested,
            [classes.processControlNestedItem]: isProcessControl,
            [classes.registerSelectNestedItem]: registerSelect && nested,
          })}
        >
          <ListItemIcon
            className={classNames({
              [classes.mobileIcon]: true,
              [classes.nestedIcon]: nested,
            })}
          >
            {linkIcon}
          </ListItemIcon>
          <ListItemText primary={primary} />
          {nested ? null : <ChevronRightOutlined />}
        </ListItemButton>
      </NavLink>
    );
  }

  return (
    <>
      <ListItemButton
        id={itemId}
        onClick={handleClick}
        className={classNames({
          [classes.item]: true,
          [classes.openedItem]: open,
          [classes.nestedItem]: nested,
          [classes.processControlNestedItem]: isProcessControl,
          [classes.registerSelectItem]: registerSelect,
          [classes.registerSelectNestedItem]: registerSelect && nested,
        })}
      >
        <ListItemIcon
          className={classNames({
            [classes.mobileIcon]: true,
            [classes.nestedIcon]: nested,
          })}
          classes={{
            root: classNames({
              [classes.listItemIconRoot]: !nested && registerSelect,
            }),
          }}
        >
          {registerSelect ? (
            <>
              {nested ? null : items ? (
                <KeyboardArrowDownIcon />
              ) : (
                <ChevronRightOutlined />
              )}
            </>
          ) : (
            <>{!items ? linkIcon : open ? openedFolderIcon : icon}</>
          )}
        </ListItemIcon>
        <ListItemText primary={description || name || stringified} />
        {registerSelect ? null : (
          <>
            {nested ? null : items ? (
              <KeyboardArrowDownIcon />
            ) : (
              <ChevronRightOutlined />
            )}
          </>
        )}
      </ListItemButton>

      {items ? (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <div
            className={classNames({
              [classes.nested]: true,
              [classes.processControlNestedItem]: isProcessControl,
              [classes.registerSelectNestedItem]: registerSelect,
              [classes.registerSelectNested]: registerSelect,
              [classes.firstLevelItem]: !nested && registerSelect,
            })}
          >
            <TreeList
              id={id}
              items={items}
              onChange={onClick}
              onMenuOpen={onMenuOpen}
              createLink={createLink}
              nested={true}
              isProcessControl={isProcessControl}
              registerSelect={registerSelect}
            />
          </div>
        </Collapse>
      ) : null}
    </>
  );
};

export default withStyles(styles)(TreeListItem);
