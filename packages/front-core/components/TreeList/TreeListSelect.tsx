import React from 'react';
import { translate } from 'react-translate';
import classNames from 'classnames';
import {
  Button,
  DialogActions,
  ListItem,
  ListItemText,
  Popover,
  TextField,
  DialogTitle,
  DialogContent,
  IconButton,
  CircularProgress,
  Paper,
  ClickAwayListener,
  Fade,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ClearIcon from '@mui/icons-material/ClearOutlined';
import { deepObjectFindAll } from 'helpers/deepObjectFind';
import TreeList from 'components/TreeList/index';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StringElement from 'components/JsonSchema/elements/StringElement';
import { styles as treeListItemStyles, TreeItem } from 'components/TreeList/TreeListItem';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

const StringElementAny = StringElement as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: Theme) => ({
  ...treeListItemStyles(theme),
  paper: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  dialogTitle: {
    padding: 0,
  },
  dialogContent: {
    padding: 0,
  },
  clearButton: {
    padding: 0,
  },
  iconBtnRoot: {
    color: '#000',
    right: -10,
  },
  popoverMobile: {
    width: '100%',
    maxHeight: 300,
    overflow: 'hidden',
    overflowY: 'scroll' as const,
  },
  chevronIcon: {
    transform: 'rotate(-90deg)',
    padding: 2,
    marginRight: 9,
  },
  clearIcon: {
    marginRight: 0,
    '& svg': {
      fontSize: '20px',
    },
  },
  addDots: {
    '& input': {
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
    },
  },
});

const relevancySort =
  (search = '') =>
  (a: TreeItem, b: TreeItem) => {
    let aIndexOf = (a.name || '').toLowerCase().indexOf(search.toLowerCase());
    let bIndexOf = (b.name || '').toLowerCase().indexOf(search.toLowerCase());

    if (aIndexOf < 0 && bIndexOf < 0) {
      return (a.name || '').localeCompare(b.name || '');
    }

    if (aIndexOf < 0) {
      aIndexOf = 100;
    }

    if (bIndexOf < 0) {
      bIndexOf = 100;
    }

    return aIndexOf > bIndexOf ? 1 : -1;
  };

interface TreeListSelectProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  selected?: TreeItem | TreeItem[] | null;
  placeholder?: string;
  error?: boolean;
  items?: TreeItem[];
  disabled?: boolean;
  id: string;
  createLink?: (item: TreeItem) => string | false | null | undefined;
  usedInTable?: boolean;
  notRequiredLabel?: boolean;
  description?: string;
  loading?: boolean;
  required?: boolean;
  multiple?: boolean;
  customHandleChange?: (value: unknown) => void;
  userInCard?: boolean;
  path?: (string | number)[];
  onSelect?: (selected: TreeItem | null) => void;
  registerSelect?: boolean;
}

interface TreeListSelectState {
  anchorEl: HTMLElement | null;
  open: boolean;
  search: string;
  items?: TreeItem[];
  hovered?: boolean;
}

class TreeListSelect extends React.Component<TreeListSelectProps, TreeListSelectState> {
  popoverTarget: React.RefObject<HTMLDivElement | null>;
  timeout: ReturnType<typeof setTimeout> | null;
  updatePosition?: () => void;

  constructor(props: TreeListSelectProps) {
    super(props);
    this.popoverTarget = React.createRef();
    this.state = {
      anchorEl: null,
      open: false,
      search: '',
      items: this.props.items,
    };
    this.timeout = null;
  }

  componentWillReceiveProps = (nextProps: TreeListSelectProps) => this.updateItems(nextProps.items);

  handleMenuOpen = ({ currentTarget }: React.SyntheticEvent) =>
    this.setState({ anchorEl: currentTarget as HTMLElement, open: true });

  handleMenuClose = () =>
    this.setState({ open: false, search: '' }, this.updateItems);

  handleSelect = (selected: TreeItem) => {
    const { onSelect } = this.props;
    onSelect && onSelect(selected);
    this.handleMenuClose();
  };

  handleClearValue = () => {
    const { onSelect } = this.props;
    onSelect && onSelect(null);
  };

  trySelect = () => {
    const { onSelect } = this.props;
    const { items } = this.state;

    if (items && items.length === 1 && onSelect) {
      onSelect(items.shift() as TreeItem);
      this.handleMenuClose();
    }
  };

  handleSearch = ({ target: { value } }: { target: { value: string } }) =>
    this.setState({ search: value }, this.updateItems);

  handleSearchRegister = (value: string) =>
    this.setState({ search: value }, this.updateItems);

  updateItems = (options?: TreeItem[]) => {
    const { search } = this.state;
    const { items } = this.props;

    const treeItems = options || items;

    if (!search) {
      this.setState({ items: treeItems }, this.updatePosition);
      return;
    }

    this.setState(
      {
        items: (deepObjectFindAll(
          treeItems || {},
          (item) => {
            const i = item as TreeItem;
            return !!(
              i &&
              !i.items &&
              i.stringified &&
              i.stringified.toLowerCase().indexOf(search.toLowerCase()) !== -1
            );
          },
        ) as TreeItem[])
          .sort(relevancySort(search))
          .slice(0, 100),
      },
      this.updatePosition,
    );
  };

  renderButton = () => {
    const { open } = this.state;
    const { t, classes, selected, placeholder, error, items, disabled, id } =
      this.props;

    let text = selected ? (selected as TreeItem).name : placeholder || t('Select');

    if (!items) {
      text = text || t('Loading');
    }

    return (
      <ListItem
        {...({ button: true, disabled } as unknown as Record<string, unknown>)}
        onClick={this.handleMenuOpen}
        className={classNames(classes.item, { [classes.error]: !!error })}
        id={id + '-select-button'}
      >
        <ListItemText inset={true} primary={text} />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
    );
  };

  renderSelected = () => {
    const { selected, classes, id, t } = this.props;

    return (
      <ListItem className={classes.item}>
        <ListItemText inset={true} primary={(selected as TreeItem).name} />
        <IconButton
          id={id + '-remove-button'}
          className={classes.clearButton}
          onClick={this.handleClearValue}
          size="large"
          aria-label={t('Clear')}
        >
          <ClearIcon />
        </IconButton>
      </ListItem>
    );
  };

  renderDefaultContent = () => {
    const { anchorEl, open, search, items } = this.state;
    const { t, createLink, classes, selected, id, usedInTable, notRequiredLabel } = this.props;

    return (
      <>
        {this.renderButton()}
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={this.handleMenuClose}
          classes={{
            paper: classes.paper,
          }}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          action={(actions) => {
            this.updatePosition = actions ? actions.updatePosition : undefined;
          }}
          PaperProps={{
            style: {
              width: usedInTable ? undefined : (anchorEl || ({} as HTMLElement)).offsetWidth,
              padding: '2px 8px',
            },
          }}
        >
          <DialogTitle id="dialog-title" className={classes.dialogTitle}>
            <TextField
              id={id + '-search-input'}
              label={t('Search')}
              fullWidth={true}
              type="search"
              margin="dense"
              variant="outlined"
              value={search}
              onChange={this.handleSearch}
              {...({ notRequiredLabel } as unknown as Record<string, unknown>)}
              onKeyPress={({ key }) => key === 'Enter' && this.trySelect()}
              autoComplete="off"
              inputRef={(input: HTMLInputElement | null) => {
                input && input.focus();
              }}
            />
          </DialogTitle>
          <DialogContent className={classes.dialogContent}>
            {selected && this.renderSelected()}
            <TreeList
              id={id + '-tree-list'}
              items={items}
              onChange={this.handleSelect}
              notRequiredLabel={notRequiredLabel}
              createLink={createLink}
              onMenuOpen={this.updatePosition}
            />
          </DialogContent>

          <DialogActions>
            <Button
              size="small"
              variant="text"
              color="primary"
              aria-label={t('Close')}
              onClick={() => this.setState({ open: false })}
            >
              {t('Close')}
            </Button>
          </DialogActions>
        </Popover>
      </>
    );
  };

  renderSelectedValueName = () => {
    const { selected } = this.props;
    const { search } = this.state;
    if (!selected || search.length) return search;
    if (!(selected as TreeItem[]).length) return search;
    return (selected as TreeItem[])[0].stringified || (selected as TreeItem[])[0].label;
  };

  onMouseOver = () => {
    if (this.timeout) clearTimeout(this.timeout);
    this.setState({ hovered: true });
  };

  onMouseOut = () => {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.setState({ hovered: false }), 100);
  };

  renderRegisterSelect = () => {
    const {
      notRequiredLabel,
      classes,
      description,
      id,
      createLink,
      loading,
      required,
      disabled,
      multiple,
      selected,
      customHandleChange = () => {},
      usedInTable,
      userInCard,
      path,
    } = this.props;
    const { search, open, items, hovered } = this.state;
    const { current } = this.popoverTarget;
    let filterItems = items;

    if (items?.length && (selected as TreeItem[])?.length) {
      filterItems = items.filter(
        (item) => !(selected as TreeItem[]).find((selectedItem) => selectedItem.id === item.id),
      );
    }
    const isMobile = window.innerWidth < 500;
    const isTyping = search.length;
    const isOpen = open || !!isTyping;

    return (
      <div ref={this.popoverTarget}>
        {multiple ? (
          <StringElementAny
            path={path}
            description={description}
            value={search}
            fullWidth={true}
            onChange={this.handleSearchRegister}
            required={required}
            onKeyDown={this.updatePosition}
            readOnly={disabled}
            notRequiredLabel={notRequiredLabel}
            endAdornment={
              <>
                {loading ? (
                  <CircularProgress size={20} />
                ) : (
                  <IconButton
                    disabled={disabled}
                    classes={{ root: classes.iconBtnRoot }}
                    onClick={this.handleMenuOpen}
                    size="large"
                  >
                    {search.length ? (
                      <ArrowForwardIcon />
                    ) : (
                      <AddCircleOutlineIcon />
                    )}
                  </IconButton>
                )}
              </>
            }
          />
        ) : (
          <div onMouseOver={this.onMouseOver} onMouseOut={this.onMouseOut}>
            <StringElementAny
              path={path}
              fullWidth={true}
              required={required}
              description={description}
              value={this.renderSelectedValueName()}
              onChange={this.handleSearchRegister}
              onFocus={(event: React.FocusEvent<HTMLInputElement>) => event.target.select()}
              notRequiredLabel={notRequiredLabel}
              onKeyDown={(event: React.KeyboardEvent) => {
                const key = (event as unknown as { keyCode?: number; charCode?: number }).keyCode ||
                  (event as unknown as { keyCode?: number; charCode?: number }).charCode;
                if (key === 8 || key === 46) customHandleChange(null);
                this.updatePosition && this.updatePosition();
              }}
              wrapperClass={classes.addDots}
              endAdornment={
                <>
                  {loading ? (
                    <CircularProgress size={16} />
                  ) : (
                    <>
                      {selected && (selected as TreeItem[]).length && hovered ? (
                        <IconButton
                          classes={{
                            root: classNames(
                              classes.iconBtnRoot,
                              classes.clearIcon,
                              classes.chevronIcon,
                            ),
                          }}
                          onClick={() => customHandleChange(null)}
                          size="large"
                        >
                          <ClearIcon />
                        </IconButton>
                      ) : null}
                      <IconButton
                        classes={{
                          root: classNames(
                            classes.iconBtnRoot,
                            classes.chevronIcon,
                          ),
                        }}
                        onClick={this.handleMenuOpen}
                        size="large"
                      >
                        <ChevronLeftIcon />
                      </IconButton>
                    </>
                  )}
                </>
              }
            />
          </div>
        )}

        {isMobile && isTyping ? (
          <>
            {isOpen ? (
              <ClickAwayListener onClickAway={() => this.handleMenuClose()}>
                <Fade in={isOpen}>
                  <Paper className={classes.popoverMobile}>
                    <TreeList
                      id={`${id}-tree-list`}
                      items={items || []}
                      onChange={this.handleSelect}
                      notRequiredLabel={notRequiredLabel}
                      onMenuOpen={this.updatePosition}
                      createLink={createLink}
                      registerSelect={true}
                      loading={loading}
                    />
                  </Paper>
                </Fade>
              </ClickAwayListener>
            ) : null}
          </>
        ) : (
          <Popover
            anchorEl={current}
            open={isOpen}
            disableAutoFocus={true}
            disableEnforceFocus={true}
            action={(actions) => {
              if (actions && actions.updatePosition) {
                this.updatePosition = actions.updatePosition;
              }
            }}
            onClose={() => {
              this.handleMenuClose();
              this.updatePosition && this.updatePosition();
            }}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            PaperProps={{
              style: {
                width: usedInTable && !userInCard ? 500 : current?.offsetWidth,
                maxHeight: 320,
                marginTop: 2,
                boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.2)',
              },
            }}
          >
            <TreeList
              id={`${id}-tree-list`}
              items={filterItems}
              onChange={this.handleSelect}
              notRequiredLabel={notRequiredLabel}
              onMenuOpen={this.updatePosition}
              createLink={createLink}
              registerSelect={true}
              loading={loading}
            />
          </Popover>
        )}
      </div>
    );
  };

  render = () => {
    const { registerSelect } = this.props;

    return (
      <>
        {registerSelect
          ? this.renderRegisterSelect()
          : this.renderDefaultContent()}
      </>
    );
  };
}

const translated = translate('TreeListSelect')(TreeListSelect as never);
export default withStyles(styles)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
