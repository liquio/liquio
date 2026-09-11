import React from 'react';
import { useDispatch } from 'react-redux';
import { useTranslate } from 'react-translate';
import {
  Paper,
  Popover,
  Button,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup
} from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import Checkbox from '@mui/material/Checkbox';
import MobileDetect from 'mobile-detect';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import { Theme } from '@mui/material/styles';

import StringElementRaw from 'components/JsonSchema/elements/StringElement';
import SelectComponentRaw from 'components/Select';
import { loadWorkflowTemplates } from 'actions/workflow';
import { ReactComponent as FilterAltOutlinedIcon } from './assets/filters_icon.svg';

const StringElement = StringElementRaw as unknown as React.ComponentType<Record<string, unknown>>;
const SelectComponent = SelectComponentRaw as unknown as React.ComponentType<Record<string, unknown>>;

type AppTheme = Theme & {
  borderColor?: string;
  leftSidebarBg?: string;
};

const styles = (theme: AppTheme) => ({
  wrapper: {
    marginBottom: 20,
    position: 'relative' as const,
    [theme.breakpoints.down('sm')]: {
      marginBottom: 10
    }
  },
  paper: {
    padding: 24,
    paddingBottom: 14,
    '&>div': {
      marginBottom: 10
    }
  },
  btnPadding: {
    padding: '0 24px',
    fontSize: 13,
    marginBottom: 1
  },
  btnClearPadding: {
    padding: '12px',
    fontSize: 13,
    lineHeight: '16px'
  },
  actions: {
    marginTop: 25,
    marginBottom: 0,
    display: 'flex',
    justifyContent: 'flex-end',
    [theme.breakpoints.down('sm')]: {
      marginRight: 0,
      marginTop: 0,
      gap: 8,
      '& button': {
        flex: 1
      }
    }
  },
  btnRootWrapper: {
    marginLeft: 8,
    [theme.breakpoints.down('sm')]: {
      marginLeft: 0,
      flex: 1
    }
  },
  flexItems: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between'
  },
  menuItem: {
    fontSize: 13,
    lineHeight: '32px',
    paddingLeft: 46,
    paddingTop: 4,
    paddingBottom: 4,
    '& svg': {
      position: 'absolute' as const,
      left: 17,
      top: 7
    }
  },
  formControlTasks: {
    paddingTop: 16
  },
  selectPopover: {
    maxHeight: '100vh',
    overflow: 'auto',
    '& .MuiPopover-paper': {
      maxHeight: 'none',
      maxWidth: 'none',
      transformOrigin: '0 0 !important',
      left: '0px !important',
      top: 'auto !important',
      bottom: '0px !important',
      height: 'calc(100vh - 26px)',
      width: '100%'
    },
    '& .MuiBackdrop-root': {
      backgroundColor: theme?.palette?.action?.disabledBackground
    }
  },
  popover: {
    '& .MuiPopover-paper': {
      width: 400
    },
    [theme.breakpoints.down('sm')]: {
      '& .MuiPopover-paper': {
        width: '100vw',
        height: '100vh',
        maxHeight: 'none',
        maxWidth: 'none',
        left: '0px !important',
        top: '0px !important',
        display: 'flex',
        flexDirection: 'column' as const
      }
    }
  },
  popoverHeader: {
    padding: 16,
    textAlign: 'center' as const,
    position: 'relative' as const,
    borderBottom: `1px solid ${theme?.borderColor || theme?.palette?.divider}`
  },
  backButton: {
    position: 'absolute' as const,
    top: '50%',
    left: '16px',
    transform: 'translateY(-50%)',
    '& svg': {
      fill: theme?.palette?.text?.primary
    }
  },
  popoverBody: {
    [theme.breakpoints.down('sm')]: {
      flex: 1,
      padding: 16,
      backgroundColor: theme?.leftSidebarBg || theme?.palette?.background?.default
    }
  },
  popoverFooter: {
    padding: 16
  },
  selectPopoverContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: 'calc(100vh - 26px)',
    padding: '16px'
  },
  selectPopoverBody: {
    flex: 1,
    overflowY: 'auto' as const
  },
  select: {
    padding: 0
  },
  rootSelect: {
    background: theme?.palette?.background?.paper,
    borderBottom: `1px solid ${theme?.palette?.text?.secondary}`,
    borderRadius: 0,
    paddingLeft: 0,
    fontSize: 16,
    fontWeight: 400,
    paddingBottom: 4,
    paddingRight: 1,
    '& .MuiSvgIcon-root': {
      color: theme?.palette?.text?.secondary
    }
  },
  filterBtn: {
    minWidth: '40px',
    '& span': {
      margin: 0
    }
  },
  filtersNumber: {
    backgroundColor: theme?.palette?.primary?.main,
    fontWeight: 700,
    color: theme?.palette?.primary?.contrastText,
    fontSize: '14px',
    lineHeight: '20px',
    padding: '2px 8px',
    borderRadius: '50%',
    marginLeft: '8px'
  },
  headerTitle: {
    fontWeight: 700,
    fontSize: '16px',
    lineHeight: '24px'
  },
  selectedFiltersLabel: {
    margin: 0,
    fontWeight: 700,
    fontSize: '14px',
    lineHeight: '20px',
    marginBottom: '8px'
  },
  filterLabel: {
    color: theme?.palette?.text?.secondary,
    lineHeight: '20px'
  },
  closeBtn: {
    marginLeft: '11px',
    '& svg': {
      width: '10px',
      height: '10px',
      fill: theme?.palette?.error?.main
    },
    '&:hover': {
      backgroundColor: 'transparent'
    }
  },
  selectedFiltersItem: {
    maxWidth: '288px',
    border: `1px solid ${theme?.borderColor || theme?.palette?.divider}`,
    borderRadius: '28px',
    padding: '6px 12px',
    display: 'flex',
    backgroundColor: theme?.palette?.background?.paper,
    '& div': {
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    '& span': {
      paddingRight: 3
    }
  },
  filters: {
    marginBottom: '16px',
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px'
  },
  selectPopoverFooter: {
    padding: '16px',
    borderTop: `1px solid ${theme?.borderColor || theme?.palette?.divider}`,
    display: 'flex',
    gap: '8px'
  },
  selectPopoverHeader: {
    fontWeight: 700,
    fontSize: '14px',
    lineHeight: '21px',
    textAlign: 'center' as const,
    marginBottom: '8px'
  }
});

const useStyles = makeStyles(styles as never);

interface MenuOption {
  id?: string | number;
  name?: string;
  value?: unknown;
  label?: string;
  options?: unknown[];
  [key: string]: unknown;
}

const optionsToMenu = (option: MenuOption | null): MenuOption | null =>
  option
    ? {
        ...option,
        value: option.id,
        label: option.name
      }
    : null;

const initState: Record<string, unknown> = {
  number: '',
  workflowCreatedBy: '',
  workflowName: '',
  performer_username: '',
  withoutPerformerUsername: false,
  is_read: ' '
};

interface SelectedFilter {
  name: string;
  value?: unknown;
  label?: string;
}

interface TaskListSearchProps {
  location: string;
  filters: Record<string, unknown>;
  actions: { onFilterChange: (filters: Record<string, unknown>) => Promise<unknown> | void };
  selectedFilters: SelectedFilter[];
  calcSelectedFilters: (value?: Record<string, unknown>) => void;
  deletedFilter: unknown;
  setDeletedFilter: (filter: unknown) => void;
}

const TaskListSearch = ({
  location,
  filters: filtersOrigin,
  actions,
  selectedFilters,
  calcSelectedFilters,
  deletedFilter,
  setDeletedFilter
}: TaskListSearchProps) => {
  const t = useTranslate('TasksListSearch');
  const classes = useStyles();
  const dispatch = useDispatch();
  const ref = React.useRef<HTMLDivElement>(null);
  const statusList = [
    { id: ' ', name: t('AllTasks') },
    { id: 'true', name: t('ReadTasks') },
    { id: 'false', name: t('NotReadTasks') }
  ];
  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();
    return isMobile;
  });

  const [open, setOpen] = React.useState(false);
  const [innerSelectedFilters, setInnerSelectedFilters] = React.useState<SelectedFilter[]>(selectedFilters);
  const [selectAnchor, setSelectAnchor] = React.useState<HTMLElement | null>(null);
  const [selectOpen, setSelectOpen] = React.useState<MenuOption | false>(false);
  const [selectPopoverValue, setSelectPopoverValue] = React.useState<unknown>('');
  const [value, setValue] = React.useState<Record<string, unknown>>({
    ...initState,
    ...filtersOrigin
  });
  const [workflowList, setWorkflowList] = React.useState<MenuOption[] | null>(null);

  const formTree = (list: { isActive?: boolean; entryTaskTemplateIds?: { hidden?: boolean }[] }[] | null) => {
    if (list === null) return [];
    const filteredList = list
      .filter(({ isActive }) => isActive)
      .filter(
        ({ entryTaskTemplateIds }) =>
          Array.isArray(entryTaskTemplateIds) &&
          entryTaskTemplateIds.filter(({ hidden }) => !hidden).length
      );

    return filteredList || [];
  };

  const handleMenuOpen = React.useCallback(async () => {
    setOpen(true);
    if (workflowList) return;
    const list = (await loadWorkflowTemplates()(dispatch as never)) as never;
    setWorkflowList((formTree(list).map(optionsToMenu) as MenuOption[]));
  }, [dispatch, workflowList]);

  const handleMenuClose = React.useCallback(() => setOpen(false), []);

  const selectHandleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectPopoverValue(event.target.value);
  }, []);

  const savePopoverSelect = React.useCallback(
    (selectOpen: MenuOption | false) => {
      if (!selectOpen) return;
      let val: unknown = selectPopoverValue || '';
      let selectedPopoverSelect = innerSelectedFilters;
      if (selectOpen.name === 'workflowName') {
        val = (selectOpen.options as MenuOption[])?.find((option) => option.id == val) || '';
      }
      if (selectOpen.name === 'is_read' && !val) {
        val = ' ';
      }
      const getValue = () => {
        if (selectOpen.name === 'workflowName') {
          return (val as MenuOption).name;
        } else if (selectOpen.name === 'is_read') {
          return val == 'true' ? t('ReadTasks') : t('NotReadTasks');
        }
        return val;
      };
      handleChange(selectOpen.name as string, val);
      setSelectOpen(false);
      if (!val || (typeof val === 'string' && !val.trim())) {
        selectedPopoverSelect = selectedPopoverSelect.filter(
          (item) => item.name !== selectOpen.name
        );
      } else {
        if (!selectedPopoverSelect.find((item) => item.name === selectOpen.name)) {
          selectedPopoverSelect = selectedPopoverSelect.concat({
            label: selectOpen.label,
            name: selectOpen.name as string,
            value: getValue()
          });
        } else {
          selectedPopoverSelect = selectedPopoverSelect.map((item) => {
            if (item.name === selectOpen.name) {
              item.value = getValue();
            }
            return {
              ...item
            };
          });
        }
      }
      setInnerSelectedFilters(selectedPopoverSelect);
    },
    [selectPopoverValue, value, innerSelectedFilters]
  );

  const handleChange = React.useCallback(
    (name: string, val: unknown) => {
      const getValue = (data: unknown) => {
        if (!data) return '';

        if (typeof data === 'object' && (data as { target?: unknown }).target) {
          return (data as { target: { checked: boolean } }).target.checked;
        }

        if (typeof data === 'object') {
          return (data as { label?: unknown }).label;
        }

        return data;
      };

      setValue({
        ...value,
        [name]: getValue(val)
      });
    },
    [value]
  );

  const concatFilters = React.useCallback(
    (filters: Record<string, unknown>) => {
      Object.keys(filters).forEach((key) => filters[key] === '' && delete filters[key]);

      if (['/tasks/my-tasks'].includes(location)) {
        delete filters.withoutPerformerUsername;
      }

      if (filters.withoutPerformerUsername === false) {
        delete filters.withoutPerformerUsername;
      }

      if (filters.withoutPerformerUsername === true) {
        delete filters.performer_username;
      }

      return filters;
    },
    [location]
  );

  const removeEmptyStrings = (obj: Record<string, unknown>) => {
    Object.keys(obj).forEach((key) => [' ', ''].includes(obj[key] as string) && delete obj[key]);
    return obj;
  };

  const handleSearch = React.useCallback(
    async ({ clear = false }: { clear?: boolean } = {}) => {
      const filters = clear ? {} : { ...value };
      if (filters.withoutPerformerUsername) {
        delete filters.performer_username;
      }
      if (clear) {
        await actions.onFilterChange(
          concatFilters(
            removeEmptyStrings({
              ...filtersOrigin,
              ...initState
            })
          )
        );
        setValue(initState);
      } else {
        await actions.onFilterChange(
          concatFilters(
            removeEmptyStrings({
              ...filtersOrigin,
              ...filters
            })
          )
        );
      }

      handleMenuClose();
      calcSelectedFilters(clear ? initState : filters);
    },
    [actions, concatFilters, filtersOrigin, handleMenuClose, value]
  );

  const handleClear = React.useCallback(() => {
    handleSearch({ clear: true });
    handleMenuClose();
  }, [handleSearch, handleMenuClose]);

  const {
    number,
    workflowCreatedBy,
    workflowName,
    performer_username,
    withoutPerformerUsername,
    is_read
  } = React.useMemo(() => value, [value]) as Record<string, string> & { withoutPerformerUsername?: boolean };

  const deleteFilter = React.useCallback(
    (deletedFilter: SelectedFilter) => {
      const newVal = {
        ...value
      };
      if (!value.withoutPerformerUsername) {
        delete newVal.withoutPerformerUsername;
      }
      delete newVal[deletedFilter.name];
      delete filtersOrigin[deletedFilter.name];
      handleChange(deletedFilter.name, initState[deletedFilter.name]);
      actions.onFilterChange(
        removeEmptyStrings({
          ...filtersOrigin,
          ...newVal
        })
      );
      if (isMobile) {
        calcSelectedFilters(newVal);
      }
    },
    [value, filtersOrigin, handleChange]
  );

  const openSelectPopover = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>, settings: MenuOption) => {
      if (isMobile) {
        let val = value[settings.name as string];
        if (settings.name === 'workflowName') {
          val = (settings.options as MenuOption[])?.find((option) => option.name === val)?.id;
        }
        setSelectPopoverValue(val);
        setSelectAnchor(event.target as HTMLElement);
        setSelectOpen(settings);
      }
    },
    [isMobile, value]
  );

  const renderSelectedFilters = React.useCallback(() => {
    return (
      <div className={(classes as { selectedFilters?: string }).selectedFilters}>
        <p className={classes.selectedFiltersLabel}>
          {t('FiltersNumber', { number: innerSelectedFilters.length })}
        </p>
        <div className={classes.filters}>
          {innerSelectedFilters.map((filter, index) => (
            <div key={index} className={classes.selectedFiltersItem}>
              <div>
                {filter.label ? <span className={classes.filterLabel}>{filter.label}:</span> : null}
                {filter.value as React.ReactNode}
              </div>
              <IconButton
                className={classes.closeBtn}
                onClick={() => deleteFilter(filter)}
                size="small"
              >
                <ClearOutlinedIcon />
              </IconButton>
            </div>
          ))}
        </div>
      </div>
    );
  }, [innerSelectedFilters, deleteFilter]);

  const renderActions = React.useCallback(() => {
    return (
      <div className={classes.actions}>
        <Button
          onClick={handleClear}
          className={(classes as { actionButton?: string }).actionButton}
          variant="outlined"
          classes={{
            label: classes.btnClearPadding,
            root: classes.btnRootWrapper
          } as never}
        >
          {isMobile ? t('ClearAll') : t('Clear')}
        </Button>
        <Button
          onClick={handleSearch as never}
          color="primary"
          variant="contained"
          className={(classes as { actionButton?: string }).actionButton}
          classes={{
            label: classes.btnPadding,
            root: classes.btnRootWrapper
          } as never}
        >
          {t('Search')}
        </Button>
      </div>
    );
    // Original omits useCallback's deps array entirely (a pre-existing
    // quirk — this recreates the callback every render, same as if the
    // second argument were simply never passed in JS); cast to satisfy
    // TS's now-required second parameter without changing that behavior.
  }, undefined as unknown as React.DependencyList);

  const renderFields = React.useCallback(() => {
    return (
      <>
        <StringElement
          description={t('Number')}
          value={number}
          onChange={(val: unknown) => handleChange('number', val)}
          required={true}
          autoFocus={true}
        />
        <StringElement
          description={t('Applicant')}
          value={workflowCreatedBy}
          onChange={(val: unknown) => handleChange('workflowCreatedBy', val)}
          required={true}
        />
        <div
          onClick={(e) =>
            openSelectPopover(e, {
              options: workflowList as unknown[],
              name: 'workflowName',
              label: t('Workflow')
            })
          }
        >
          <SelectComponent
            description={t('Workflow')}
            options={workflowList}
            isLoading={!workflowList}
            value={(workflowList || []).find(({ label }) => workflowName === label)}
            multiple={false}
            usedInTable={true}
            userInCard={true}
            onChange={(val: unknown) => handleChange('workflowName', val)}
            readOnly={isMobile}
          />
        </div>

        <div
          onClick={(e) =>
            openSelectPopover(e, {
              options: statusList,
              name: 'is_read',
              label: t('Status')
            })
          }
        >
          <StringElement
            description={t('Status')}
            deleteIcon={false}
            required={true}
            value={is_read}
            onChange={(val: unknown) => handleChange('is_read', val)}
            options={statusList}
            readOnly={isMobile}
          />
        </div>

        {isMobile ? (
          <Popover
            anchorEl={selectAnchor}
            open={!!selectOpen}
            disableAutoFocus={true}
            disableEnforceFocus={true}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left'
            }}
            transformOrigin={{
              vertical: 'bottom',
              horizontal: 'left'
            }}
            className={classes.selectPopover}
            onClose={() => {
              setSelectOpen(false);
              setSelectAnchor(null);
            }}
          >
            <div className={classes.selectPopoverContainer}>
              <div className={classes.selectPopoverHeader}>{(selectOpen as MenuOption)?.label}</div>
              <div className={classes.selectPopoverBody}>
                <RadioGroup
                  aria-labelledby="demo-radio-buttons-group-label"
                  value={selectPopoverValue}
                  onChange={selectHandleChange}
                  name="radio-buttons-group"
                >
                  {(selectOpen as MenuOption)?.options?.map((option) => (
                    <FormControlLabel
                      key={(option as MenuOption).id}
                      value={(option as MenuOption).id}
                      control={<Radio />}
                      label={(option as MenuOption).name}
                    />
                  ))}
                </RadioGroup>
              </div>
              <div className={classes.selectPopoverFooter}>
                <Button
                  onClick={() => setSelectPopoverValue('')}
                  className={(classes as { actionButton?: string }).actionButton}
                  variant="outlined"
                  classes={{
                    label: classes.btnClearPadding,
                    root: classes.btnRootWrapper
                  } as never}
                >
                  {t('Clear')}
                </Button>
                <Button
                  onClick={() => savePopoverSelect(selectOpen)}
                  color="primary"
                  variant="contained"
                  className={(classes as { actionButton?: string }).actionButton}
                  classes={{
                    label: classes.btnPadding,
                    root: classes.btnRootWrapper
                  } as never}
                >
                  {t('Search')}
                </Button>
              </div>
            </div>
          </Popover>
        ) : null}

        {['/tasks/unit-tasks', '/tasks/closed-unit-tasks'].includes(location) &&
        !withoutPerformerUsername ? (
          <StringElement
            description={t('Performer')}
            value={performer_username}
            onChange={(val: unknown) => handleChange('performer_username', val)}
            required={true}
          />
        ) : null}

        {['/tasks/unit-tasks'].includes(location) ? (
          <FormControlLabel
            control={
              <Checkbox
                onChange={(val) => handleChange('withoutPerformerUsername', val as never)}
                checked={withoutPerformerUsername}
              />
            }
            label={t('NoPerformer')}
          />
        ) : null}

        {!isMobile ? renderActions() : null}
      </>
    );
  }, [
    number,
    workflowCreatedBy,
    workflowName,
    performer_username,
    withoutPerformerUsername,
    is_read,
    classes,
    t,
    location,
    workflowList,
    selectOpen,
    selectAnchor,
    selectPopoverValue,
    handleChange,
    handleClear,
    handleSearch
  ]);

  React.useEffect(() => {
    if (deletedFilter) {
      if (deletedFilter === 'all') {
        delete initState.withoutPerformerUsername;
        actions.onFilterChange(
          removeEmptyStrings({
            ...filtersOrigin,
            ...initState
          })
        );
      } else {
        deleteFilter(deletedFilter as SelectedFilter);
      }
      setDeletedFilter(null);
    }
  }, [deletedFilter]);

  React.useEffect(() => {
    setInnerSelectedFilters(selectedFilters);
  }, [selectedFilters]);

  return (
    <div ref={ref} className={classes.flexItems}>
      <Button
        className={isMobile ? classes.filterBtn : undefined}
        onClick={handleMenuOpen}
        startIcon={<FilterAltOutlinedIcon />}
      >
        {!isMobile ? t('Filters') : null}{' '}
        {innerSelectedFilters.length ? (
          <span className={classes.filtersNumber}>{innerSelectedFilters.length}</span>
        ) : null}
      </Button>

      <Popover
        anchorEl={ref.current}
        open={open}
        disableAutoFocus={true}
        disableEnforceFocus={true}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left'
        }}
        className={classes.popover}
        onClose={handleMenuClose}
      >
        {isMobile ? (
          <div className={classes.popoverHeader}>
            <IconButton onClick={handleMenuClose} size="small" className={classes.backButton}>
              <KeyboardArrowLeftIcon />
            </IconButton>
            <span className={classes.headerTitle}>{t('Filters')}</span>
          </div>
        ) : null}
        <div className={classes.popoverBody}>
          {isMobile && innerSelectedFilters.length ? renderSelectedFilters() : null}
          <Paper className={classes.paper}>{renderFields()}</Paper>
        </div>
        {isMobile ? <div className={classes.popoverFooter}>{renderActions()}</div> : null}
      </Popover>
    </div>
  );
};

export default TaskListSearch;
