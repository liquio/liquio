import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { List, ListSubheader, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ProgressLine from 'components/Preloader/ProgressLine';
import TreeListItem from 'components/TreeList/TreeListItem';

const style = () => ({
  root: {
    width: '100%',
    padding: 0,
  },
  paper: {
    padding: 12,
  },
});

const TreeList = ({
  t,
  classes,
  subheader,
  items,
  onChange,
  onMenuOpen,
  createLink,
  id,
  registerSelect,
  wrapperStyles,
  listWithAddIcon,
  isProcessesList,
  nested,
  isProcessControl,
  focusFirstItemRef,
  itemRefs,
}) => {
  if (!items) return <ProgressLine loading={true} />;

  const localItemRefs = React.useRef([]);
  const refs = itemRefs || localItemRefs;
  const lastFocusedRef = React.useRef(null);
  refs.current = [];

  const handleKeyDown = (e) => {
    const allFocusable = Array.from(
      e.currentTarget.querySelectorAll('[id$="-item"]')
    ).filter((el) => el.tabIndex === 0 && el.offsetParent !== null);

    const currentActive = lastFocusedRef.current || document.activeElement;
    const currentIndex = allFocusable.findIndex((el) => el === currentActive);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = allFocusable[currentIndex + 1];
      if (next) {
        next.focus();
        lastFocusedRef.current = next;
      }
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = allFocusable[currentIndex - 1];
      if (prev) {
        prev.focus();
        lastFocusedRef.current = prev;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      currentActive?.click?.();
    }
  };
  return (
    <List
      id={id}
      component="ul"
      role="list"
      subheader={<ListSubheader component="div">{subheader}</ListSubheader>}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      className={wrapperStyles || (!registerSelect ? classes.root : null)}
    >
      {items.length ? (
        (items || []).map((item, key) => (
          <TreeListItem
            key={key}
            id={id + '-' + key}
            item={item}
            onClick={onChange}
            onMenuOpen={onMenuOpen}
            link={!item.items && createLink && createLink(item)}
            createLink={createLink}
            registerSelect={registerSelect}
            listWithAddIcon={listWithAddIcon}
            isProcessesList={isProcessesList}
            nested={nested}
            isProcessControl={isProcessControl}
            forwardedRef={(el) => {
              if (el) {
                refs.current.push(el);

                el.onfocus = () => {
                  lastFocusedRef.current = el;
                };

                if (key === 0 && focusFirstItemRef) {
                  focusFirstItemRef.current = el;
                }
              }
            }}
            itemRefs={refs}
          />
        ))
      ) : (
        <li role="listitem">
          <Typography className={classes.paper} variant={'body1'} tabIndex={0}>
            {t('NoOptions')}
          </Typography>
        </li>
      )}
    </List>
  );
};

TreeList.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  subheader: PropTypes.string,
  items: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  onMenuOpen: PropTypes.func.isRequired,
  id: PropTypes.string.isRequired,
  registerSelect: PropTypes.bool,
  listWithAddIcon: PropTypes.bool,
  isProcessesList: PropTypes.bool,
  nested: PropTypes.bool,
  isProcessControl: PropTypes.bool,
};

TreeList.defaultProps = {
  items: [],
  subheader: '',
  registerSelect: false,
  listWithAddIcon: false,
  onMenuOpen: () => null,
  id: '',
  isProcessesList: false,
  nested: false,
  isProcessControl: false,
};

export { default as TreeListItem } from 'components/TreeList/TreeListItem';
export { default as TreeListSelect } from 'components/TreeList/TreeListSelect';
const translated = translate('Elements')(TreeList);
export default withStyles(style)(translated);
