import React from 'react';
import { translate } from 'react-translate';
import { List, ListSubheader, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ProgressLine from 'components/Preloader/ProgressLine';
import TreeListItem, { TreeItem } from 'components/TreeList/TreeListItem';

const style = () => ({
  root: {
    width: '100%',
    padding: 0,
  },
  paper: {
    padding: 12,
  },
});

interface TreeListProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  subheader?: string;
  items?: TreeItem[];
  onChange: (item: TreeItem) => void;
  onMenuOpen?: () => void;
  createLink?: (item: TreeItem) => string | false | null | undefined;
  id: string;
  registerSelect?: boolean;
  wrapperStyles?: string;
  listWithAddIcon?: boolean;
  isProcessesList?: boolean;
  nested?: boolean;
  isProcessControl?: boolean;
  focusFirstItemRef?: React.MutableRefObject<HTMLElement | null>;
  itemRefs?: React.MutableRefObject<HTMLElement[]>;
}

const TreeList = ({
  t,
  classes,
  subheader = '',
  items = [],
  onChange,
  onMenuOpen = () => null,
  createLink,
  id = '',
  registerSelect = false,
  wrapperStyles,
  listWithAddIcon = false,
  isProcessesList = false,
  nested = false,
  isProcessControl = false,
  focusFirstItemRef,
  itemRefs,
}: TreeListProps) => {
  if (!items) return <ProgressLine loading={true} />;

  const localItemRefs = React.useRef<HTMLElement[]>([]);
  const refs = itemRefs || localItemRefs;
  const lastFocusedRef = React.useRef<HTMLElement | null>(null);
  refs.current = [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const allFocusable = Array.from(
      (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[id$="-item"]')
    ).filter((el) => el.tabIndex === 0 && el.offsetParent !== null);

    const currentActive = lastFocusedRef.current || (document.activeElement as HTMLElement | null);
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
      (currentActive as unknown as { click?: () => void } | null)?.click?.();
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
      className={wrapperStyles || (!registerSelect ? classes.root : undefined)}
    >
      {items.length ? (
        (items || []).map((item, key) => (
          <TreeListItem
            key={key}
            {...({
              id: id + '-' + key,
              item,
              onClick: onChange,
              onMenuOpen,
              link: !item.items && createLink && createLink(item),
              createLink,
              registerSelect,
              listWithAddIcon,
              isProcessesList,
              nested,
              isProcessControl,
              forwardedRef: (el: HTMLElement | null) => {
                if (el) {
                  refs.current.push(el);

                  (el as unknown as { onfocus: () => void }).onfocus = () => {
                    lastFocusedRef.current = el;
                  };

                  if (key === 0 && focusFirstItemRef) {
                    focusFirstItemRef.current = el;
                  }
                }
              },
              itemRefs: refs,
            } as unknown as Record<string, unknown>)}
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

export { default as TreeListItem } from 'components/TreeList/TreeListItem';
export { default as TreeListSelect } from 'components/TreeList/TreeListSelect';
const translated = translate('Elements')(TreeList as never);
export default withStyles(style)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
