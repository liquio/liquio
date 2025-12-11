import React from 'react';
import PropTypes from 'prop-types';
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

import StringElement from 'components/JsonSchema/elements/StringElement';
import SelectComponent from 'components/Select';
import { loadWorkflowTemplates } from 'actions/workflow';
import { ReactComponent as FilterAltOutlinedIcon } from './assets/filters_icon.svg';

const styles = (theme) => ({
  wrapper: {
    marginBottom: 20,
    position: 'relative',
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
      position: 'absolute',
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
      backgroundColor: 'rgba(0,0,0,.5)'
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
        flexDirection: 'column'
      }
    }
  },
  popoverHeader: {
    padding: 16,
    textAlign: 'center',
    position: 'relative',
    borderBottom: '1px solid #D9D9D9'
  },
  backButton: {
    position: 'absolute',
    top: '50%',
    left: '16px',
    transform: 'translateY(-50%)',
    '& svg': {
      fill: '#000'
    }
  },
  popoverBody: {
    [theme.breakpoints.down('sm')]: {
      flex: 1,
      padding: 16,
      backgroundColor: '#F2F7FF'
    }
  },
  popoverFooter: {
    padding: 16
  },
  selectPopoverContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 26px)',
    padding: '16px'
  },
  selectPopoverBody: {
    flex: 1,
    overflowY: 'auto'
  },
  select: {
    padding: 0
  },
  rootSelect: {
    background: '#fff',
    borderBottom: '1px solid #949494',
    borderRadius: 0,
    paddingLeft: 0,
    fontSize: 16,
    fontWeight: 400,
    paddingBottom: 4,
    paddingRight: 1,
    '& .MuiSvgIcon-root': {
      color: '#757575'
    }
  },
  filterBtn: {
    minWidth: '40px',
    '& span': {
      margin: 0
    }
  },
  filtersNumber: {
    backgroundColor: '#0068FF',
    fontWeight: 700,
    color: '#fff',
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
    color: '#444444',
    lineHeight: '20px'
  },
  closeBtn: {
    marginLeft: '11px',
    '& svg': {
      width: '10px',
      height: '10px',
      fill: '#B01038'
    },
    '&:hover': {
      backgroundColor: 'transparent'
    }
  },
  selectedFiltersItem: {
    maxWidth: '288px',
    border: '1px solid #D2D2D2',
    borderRadius: '28px',
    padding: '6px 12px',
    display: 'flex',
    backgroundColor: '#fff',
    '& div': {
      whiteSpace: 'nowrap',
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
    flexWrap: 'wrap',
    gap: '4px'
  },
  selectPopoverFooter: {
    padding: '16px',
    borderTop: '1px solid #E2E8F0',
    display: 'flex',
    gap: '8px'
  },
  selectPopoverHeader: {
    fontWeight: 700,
    fontSize: '14px',
    lineHeight: '21px',
    textAlign: 'center',
    marginBottom: '8px'
  }
});

const useStyles = makeStyles(styles);

const optionsToMenu = (option) =>
  option
    ? {
        ...option,
        value: option.id,
        label: option.name
      }
    : null;

const initState = {
  number: '',
  workflowCreatedBy: '',
  workflowName: '',
  performer_username: '',
  withoutPerformerUsername: false,
  is_read: ' '
};

const TaskListSearch = ({
  location,
  filters: filtersOrigin,
  actions,
  selectedFilters,
  calcSelectedFilters,
  deletedFilter,
  setDeletedFilter
}) => {
  const t = useTranslate('TasksListSearch');
  const classes = useStyles();
  const dispatch = useDispatch();
  const ref = React.useRef(null);
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
  const [innerSelectedFilters, setInnerSelectedFilters] = React.useState(selectedFilters);
  const [selectAnchor, setSelectAnchor] = React.useState(null);
  const [selectOpen, setSelectOpen] = React.useState(false);
  const [selectPopoverValue, setSelectPopoverValue] = React.useState('');
  const [value, setValue] = React.useState({
    ...initState,
    ...filtersOrigin
  });
  const [workflowList, setWorkflowList] = React.useState(null);

  const formTree = (list) => {
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
    const list = await loadWorkflowTemplates()(dispatch);
    setWorkflowList(formTree(list).map(optionsToMenu));
  }, [dispatch, workflowList]);

  const handleMenuClose = React.useCallback(() => setOpen(false), []);

  const selectHandleChange = React.useCallback((event) => {
    setSelectPopoverValue(event.target.value);
  }, []);

  const savePopoverSelect = React.useCallback(
    (selectOpen) => {
      let val = selectPopoverValue || '';
      let selectedPopoverSelect = innerSelectedFilters;
      if (selectOpen.name === 'workflowName') {
        val = selectOpen.options.find((option) => option.id == val) || '';
      }
      if (selectOpen.name === 'is_read' && !val) {
        val = ' ';
      }
      const getValue = () => {
        if (selectOpen.name === 'workflowName') {
          return val.name;
        } else if (selectOpen.name === 'is_read') {
          return val == 'true' ? t('ReadTasks') : t('NotReadTasks');
        }
        return val;
      };
      handleChange(selectOpen.name, val);
      setSelectOpen(false);
      if (!val || (typeof val === 'string' && !val.trim())) {
        selectedPopoverSelect = selectedPopoverSelect.filter(
          (item) => item.name !== selectOpen.name
        );
      } else {
        if (!selectedPopoverSelect.find((item) => item.name === selectOpen.name)) {
          selectedPopoverSelect.push({
            label: selectOpen.label,
            name: selectOpen.name,
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
    (name, val) => {
      const getValue = (data) => {
        if (!data) return '';

        if (typeof data === 'object' && data.target) {
          return data.target.checked;
        }

        if (typeof data === 'object') {
          return data.label;
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
    (filters) => {
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

  const removeEmptyStrings = (obj) => {
    Object.keys(obj).forEach((key) => [' ', ''].includes(obj[key]) && delete obj[key]);
    return obj;
  };

  const handleSearch = React.useCallback(
    async ({ clear = false }) => {
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
  } = React.useMemo(() => value, [value]);

  const deleteFilter = React.useCallback(
    (deletedFilter) => {
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
    (event, settings) => {
      if (isMobile) {
        let val = value[settings.name];
        if (settings.name === 'workflowName') {
          val = settings.options.find((option) => option.name === val)?.id;
        }
        setSelectPopoverValue(val);
        setSelectAnchor(event.target);
        setSelectOpen(settings);
      }
    },
    [isMobile, value]
  );

  const renderSelectedFilters = React.useCallback(() => {
    return (
      <div className={classes.selectedFilters}>
        <p className={classes.selectedFiltersLabel}>
          {t('FiltersNumber', { number: innerSelectedFilters.length })}
        </p>
        <div className={classes.filters}>
          {innerSelectedFilters.map((filter, index) => (
            <div key={index} className={classes.selectedFiltersItem}>
              <div>
                {filter.label ? <span className={classes.filterLabel}>{filter.label}:</span> : null}
                {filter.value}
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
          className={classes.actionButton}
          variant="outlined"
          classes={{
            label: classes.btnClearPadding,
            root: classes.btnRootWrapper
          }}
        >
          {isMobile ? t('ClearAll') : t('Clear')}
        </Button>
        <Button
          onClick={handleSearch}
          color="primary"
          variant="contained"
          className={classes.actionButton}
          classes={{
            label: classes.btnPadding,
            root: classes.btnRootWrapper
          }}
        >
          {t('Search')}
        </Button>
      </div>
    );
  });

  const renderFields = React.useCallback(() => {
    return (
      <>
        <StringElement
          description={t('Number')}
          value={number}
          onChange={(val) => handleChange('number', val)}
          required={true}
          autoFocus={true}
        />
        <StringElement
          description={t('Applicant')}
          value={workflowCreatedBy}
          onChange={(val) => handleChange('workflowCreatedBy', val)}
          required={true}
        />
        <div
          onClick={(e) =>
            openSelectPopover(e, {
              options: workflowList,
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
            onChange={(val) => handleChange('workflowName', val)}
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
            onChange={(val) => handleChange('is_read', val)}
            options={statusList}
            readOnly={isMobile}
          />
        </div>

        {isMobile ? (
          <Popover
            anchorEl={selectAnchor}
            open={selectOpen}
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
              <div className={classes.selectPopoverHeader}>{selectOpen?.label}</div>
              <div className={classes.selectPopoverBody}>
                <RadioGroup
                  aria-labelledby="demo-radio-buttons-group-label"
                  value={selectPopoverValue}
                  onChange={selectHandleChange}
                  name="radio-buttons-group"
                >
                  {selectOpen.options?.map((option) => (
                    <FormControlLabel key={option.id} value={option.id} control={<Radio />} label={option.name} />
                  ))}
                </RadioGroup>
              </div>
              <div className={classes.selectPopoverFooter}>
                <Button
                  onClick={() => setSelectPopoverValue('')}
                  className={classes.actionButton}
                  variant="outlined"
                  classes={{
                    label: classes.btnClearPadding,
                    root: classes.btnRootWrapper
                  }}
                >
                  {t('Clear')}
                </Button>
                <Button
                  onClick={() => savePopoverSelect(selectOpen)}
                  color="primary"
                  variant="contained"
                  className={classes.actionButton}
                  classes={{
                    label: classes.btnPadding,
                    root: classes.btnRootWrapper
                  }}
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
            onChange={(val) => handleChange('performer_username', val)}
            required={true}
          />
        ) : null}

        {['/tasks/unit-tasks'].includes(location) ? (
          <FormControlLabel
            control={
              <Checkbox
                onChange={(val) => handleChange('withoutPerformerUsername', val)}
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
        deleteFilter(deletedFilter);
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
        className={isMobile ? classes.filterBtn : null}
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

TaskListSearch.propTypes = {
  classes: PropTypes.object.isRequired,
  filters: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  location: PropTypes.string.isRequired,
  actionsImported: PropTypes.object.isRequired
};

export default TaskListSearch;
