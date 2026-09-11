/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { useTranslate } from 'react-translate';
import _ from 'lodash';
import classNames from 'classnames';
import moment from 'moment';
import cleenDeep from 'clean-deep';
import {
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  TextField,
  Button,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import withStyles from '@mui/styles/withStyles';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import { DatePicker } from '@mui/x-date-pickers';
import StringElement from 'components/JsonSchema/elements/StringElement';
import { ReactComponent as CalendarIcon } from 'application/modules/messages/pages/Message/assets/ic_calendar.svg';
import { ReactComponent as ClearIcon } from 'application/modules/messages/pages/Message/assets/clear.svg';
import evaluate from 'helpers/evaluate';
import CloseIcon from '@mui/icons-material/Close';
import styles from './styles';
import RenderPopup from './renderPopup';
import MobileDetect from 'mobile-detect';

const EMPTY_FILTER_VALUE = 'EMPTY_FILTER_VALUE';

const RenderSelectFilter = ({ filter, value, options, onChange }) => {
  const t = useTranslate('TaskPage');

  const getOptionLabel = (opt) => opt?.stringified || opt?.label || opt?.name;

  return (
    <Autocomplete
      value={options.find((option) => option.id === value) || null}
      options={options}
      getOptionLabel={getOptionLabel}
      onChange={(_, value) => onChange(value?.id)}
      loadingText={t('Loading')}
      noOptionsText={t('noOptionsText')}
      openText={t('openText')}
      clearText={t('clearText')}
      closeText={t('closeText')}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="standard"
          label={filter?.description}
          placeholder={filter?.actionText}
          InputProps={{
            ...params.InputProps,
            autoComplete: 'off',
            startAdornment: <></>,
          }}
        />
      )}
    />
  );

};

const RenderStringFilter = ({
  filter,
  value,
  options,
  path,
  onChange,
  autoFocus,
  classes,
  ...rest
}) => {
  const t = useTranslate('TaskPage');

  const getOptions = React.useCallback(() => {
    if (
      options &&
      options.length > 0 &&
      !options.find((option) => option.id === EMPTY_FILTER_VALUE)
    ) {
      options.push({ id: EMPTY_FILTER_VALUE, name: filter.placeholder });
    }
    return options;
  }, [options, filter]);

  const onInput = React.useCallback(
    (val) => {
      if (!filter.changeOnBlur) {
        onChange(val);
      }
    },
    [filter],
  );

  const onBlur = React.useCallback(
    (e) => {
      const val = e.target.value;
      if (filter.changeOnBlur) {
        onChange(val);
      }
    },
    [filter],
  );

  if (filter?.variant === 'select') {
    const getOptionLabel = (opt) => opt?.stringified || opt?.label || opt?.name;

    return (
      <Autocomplete
        value={options.find((option) => option.id === value)}
        options={options}
        getOptionLabel={getOptionLabel}
        onChange={(_, value) => onChange(value?.id)}
        loadingText={t('Loading')}
        noOptionsText={t('noOptionsText')}
        openText={t('openText')}
        clearText={t('clearText')}
        closeText={t('closeText')}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="standard"
            label={filter?.description}
            placeholder={filter?.actionText}
            InputProps={{
              ...params.InputProps,
              autoComplete: 'off',
              startAdornment: <FilterAltOutlinedIcon />,
            }}
          />
        )}
      />
    );
  }

  const valueToRender = options && !value ? EMPTY_FILTER_VALUE : value;

  return (
    <StringElement
      description={filter?.description}
      value={valueToRender}
      noMargin={true}
      required={true}
      autoFocus={autoFocus || filter?.autoFocus}
      options={getOptions()}
      path={path}
      variant={'standard'}
      maxLength={filter?.maxLength || 256}
      placeholder={filter?.placeholder || filter?.description}
      startAdornment={
        <>{options ? <FilterAltOutlinedIcon /> : <SearchIcon />}</>
      }
      className={classes.disableTransition}
      onChange={onInput}
      onBlur={onBlur}
      deleteIcon={!(valueToRender === EMPTY_FILTER_VALUE)}
      {...rest}
    />
  );
};

const RenderDatePickers = ({
  classes,
  filter,
  filterKey,
  requestFilters,
  onFilterChange,
  t,
  getMaxDate,
  getDateFormat,
  getMinDate,
}) => {
  const [error, setError] = React.useState(false);
  return (
    <DatePicker
      value={
        requestFilters[filterKey]
          ? moment(requestFilters[filterKey], getDateFormat(filter)).format(
              'YYYY-MM-DD',
            )
          : null
      }
      onChange={(value) => {
        if (value && value.isValid()) {
          setError(false);
          onFilterChange({
            ...requestFilters,
            [filterKey]: value
              ? moment(value.toDate()).format(getDateFormat(filter))
              : null,
          });
        } else {
          setError(true);
        }
      }}
      error={error}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="standard"
          autoComplete="off"
          inputProps={{
            ...params.inputProps,
            placeholder: t('DatePlaceholder'),
          }}
        />
      )}
      components={{ OpenPickerIcon: CalendarIcon }}
      label={filter?.description}
      className={classes.disableTransition}
      maxDate={getMaxDate(filter)}
      minDate={getMinDate(filter)}
    />
  );
};

const RenderFilters = ({
  classes,
  filters,
  onFilterChange: onFilterChangeOrigin,
  requestFilters: requestFiltersOrigin,
  sort,
  setSort,
  sortDirection,
  setSortDirection,
  rootDocument,
  setCurrentPage,
}) => {
  const [requestFilters, onFilterChange] = React.useState(requestFiltersOrigin);
  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();
    return isMobile;
  });
  const mappedFilters = React.useMemo(() => {
    const newFilters = {};
    Object.keys(filters).forEach((key) => {
      if (filters[key]?.variant === 'popup') {
        Object.assign(newFilters, filters[key].keys);
      } else {
        newFilters[key] = filters[key];
      }
    });
    return {
      ...newFilters,
    };
  }, [filters]);

  const t = useTranslate('Elements');

  let [timeout] = React.useState(null);

  const keys = React.useMemo(() => Object.keys(filters), [filters]);

  const FilterWrapper = React.useCallback(
    ({ filter, children }) => (
      <div
        className={classes.filterItem}
        style={{
          width: filter?.width,
        }}
        key={_.uniqueId()}
      >
        {children}
      </div>
    ),
    [classes.filterItem],
  );

  const getOptions = React.useCallback(
    (item) => {
      let options = null;

      if (typeof item?.options === 'string') {
        options = evaluate(item?.options, rootDocument.data);
      } else {
        options = item?.options;
      }

      return options;
    },
    [rootDocument],
  );

  const getMaxDate = React.useCallback(
    (item) => {
      if (typeof item?.maxDate === 'string') {
        return evaluate(item?.maxDate, rootDocument.data);
      }
      return '';
    },
    [rootDocument],
  );

  const getDateFormat = React.useCallback((item) => {
    if (typeof item?.dateFormat === 'string') {
      return item?.dateFormat;
    }
    return 'DD.MM.YYYY';
  }, []);

  const getMinDate = React.useCallback(
    (item) => {
      if (typeof item?.minDate === 'string') {
        return evaluate(item?.minDate, moment, rootDocument.data);
      }
      return '';
    },
    [rootDocument],
  );

  const clearFilters = React.useCallback(() => {
    onFilterChange({});
    onFilterChangeOrigin({});
    setCurrentPage(0);
  }, [onFilterChangeOrigin, setCurrentPage]);

  if (!filters) return null;

  const hasActiveFilters = !!Object.keys(
    cleenDeep(requestFiltersOrigin),
  )?.filter((key) => !!mappedFilters[key] && !mappedFilters[key]?.value)
    ?.length;

  return (
    <>
      <div className={classes.wrapper}>
        {keys.map((key) => {
          const filter = filters[key];

          if (filter.hidden) return null;

          if (filter.type === 'string') {
            const options = getOptions(filter);

            const multiFilters = Object.keys(filter?.keys || {}).map((key) => ({
              ...filter?.keys[key],
              key,
            }));

            const StringElementComponent = (props) => (
              <>
                {multiFilters.length > 0 ? (
                  <>
                    {multiFilters.map((multiFilter, index) => (
                      <div
                        className={classNames({
                          [classes.multiFiltersItem]:
                            index !== multiFilters.length - 1,
                        })}
                        key={[multiFilter.key, _.uniqueId()]}
                      >
                        {multiFilter.control === 'date' ? (
                          <RenderDatePickers
                            {...props}
                            classes={classes}
                            filter={multiFilter}
                            filterKey={multiFilter?.key}
                            requestFilters={requestFilters}
                            onFilterChange={onFilterChange}
                            t={t}
                            getMaxDate={getMaxDate}
                            getDateFormat={getDateFormat}
                            getMinDate={getMinDate}
                          />
                        ) : (
                          <RenderStringFilter
                            key={key}
                            classes={classes}
                            filter={multiFilter}
                            value={requestFilters[multiFilter.key]}
                            options={getOptions(multiFilter)}
                            path={[multiFilter.key, _.uniqueId()]}
                            autoFocus={
                              multiFilter?.autoFocus ||
                              requestFilters[multiFilter.key]
                            }
                            onChange={(value) => {
                              onFilterChange({
                                ...requestFilters,
                                [multiFilter.key]: value,
                              });
                            }}
                            requestFilters={requestFilters}
                            onFilterChange={onFilterChange}
                            onFilterChangeOrigin={onFilterChangeOrigin}
                            FilterWrapper={FilterWrapper}
                            {...props}
                          />
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <RenderStringFilter
                    key={key}
                    classes={classes}
                    filter={filter}
                    value={requestFilters[key]}
                    options={options}
                    path={[key, _.uniqueId()]}
                    onChange={(value) => {
                      clearTimeout(timeout);
                      const { isPopup = false } = props || {};

                      timeout = setTimeout(
                        () => {
                          onFilterChange({
                            ...requestFilters,
                            [key]: value,
                          });
                          if (!isPopup) {
                            onFilterChangeOrigin({
                              ...requestFilters,
                              [key]: value,
                            });
                          }
                        },
                        filter?.options || isPopup ? 50 : 1000,
                      );
                    }}
                    {...props}
                  />
                )}
              </>
            );

            const SelectElementComponent = (props) => (
              <RenderSelectFilter
                key={key}
                classes={classes}
                filter={filter}
                value={requestFilters[key]}
                options={options}
                path={[key, _.uniqueId()]}
                onChange={(value) => {
                  clearTimeout(timeout);
                  timeout = setTimeout(
                    () => {
                      onFilterChange({
                        ...requestFilters,
                        [key]: value,
                      });
                      onFilterChangeOrigin({
                        ...requestFilters,
                        [key]: value,
                      });
                    },
                    filter?.options ? 50 : 1000,
                  );
                }}
                {...props}
              />
            );

            if (filter?.variant === 'popup') {
              return (
                <RenderPopup
                  filter={filter}
                  classes={classes}
                  key={key}
                  requestFilters={requestFilters}
                  actionsBlock={(callback = null) => (
                    <div className={classes.actionBlock}>
                      <Button
                        classes={{
                          root: classes.clearButton,
                        }}
                        onClick={() => {
                          if (typeof callback === 'function') {
                            callback();
                          }
                          onFilterChangeOrigin(requestFilters);
                        }}
                      >
                        {t('ApplyFilter')}
                      </Button>

                      <Button
                        onClick={() => {
                          const newFilters = {
                            ...requestFilters,
                          };

                          if (multiFilters.length > 0) {
                            multiFilters.forEach((multiFilter) => {
                              newFilters[multiFilter.key] = null;
                            });
                          } else {
                            newFilters[key] = null;
                          }

                          onFilterChange(newFilters);

                          setTimeout(
                            () => onFilterChangeOrigin(newFilters),
                            100,
                          );
                        }}
                        startIcon={<ClearIcon />}
                        classes={{
                          root: classes.clearButton,
                        }}
                      >
                        {t('ClearFilter')}
                      </Button>
                    </div>
                  )}
                >
                  {filter.control === 'date' ? (
                    <RenderDatePickers
                      classes={classes}
                      filter={filter}
                      filterKey={key}
                      requestFilters={requestFilters}
                      onFilterChange={onFilterChange}
                      t={t}
                      getMaxDate={getMaxDate}
                      getDateFormat={getDateFormat}
                      getMinDate={getMinDate}
                    />
                  ) : (
                    <StringElementComponent />
                  )}
                </RenderPopup>
              );
            }

            if (filter?.variant === 'select') {
              return (
                <FilterWrapper filter={filter} key={_.uniqueId()}>
                  <SelectElementComponent />
                </FilterWrapper>
              );
            }

            return (
              <FilterWrapper filter={filter} key={_.uniqueId()}>
                <StringElementComponent />
              </FilterWrapper>
            );
          }

          if (filter.type === 'checkbox') {
            return (
              <FilterWrapper filter={filter} key={_.uniqueId()}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={requestFilters[key]}
                      onChange={() => {
                        const newFilters = {
                          ...requestFilters,
                          [key]: requestFilters[key] === true ? '' : true,
                        };

                        onFilterChange(newFilters);

                        setTimeout(() => onFilterChangeOrigin(newFilters), 100);
                      }}
                      name={key}
                      color="primary"
                      aria-label={filter?.description}
                    />
                  }
                  label={filter?.description}
                  classes={{
                    label: classes.checkboxLabel,
                  }}
                />
              </FilterWrapper>
            );
          }

          if (filter.type === 'sort') {
            const renderValue = (value) => {
              const chosenOption = filter?.options.find(
                (option) => option.id === value,
              );

              return (
                <Typography variant="body2" className={classes.sortTextWrapper}>
                  <CheckIcon className={classes.checkSortIcon} />

                  <Typography variant="subheading2">
                    {chosenOption?.name}
                  </Typography>
                </Typography>
              );
            };

            return (
              <FilterWrapper filter={filter} key={_.uniqueId()}>
                <Select
                  value={sort}
                  onChange={({ target: { value } }) => setSort(value)}
                  IconComponent={() => (
                    <>
                      {sortDirection === 'desc' ? (
                        <ArrowDownwardIcon
                          onClick={() => setSortDirection('asc')}
                          className={classes.dropArrow}
                        />
                      ) : (
                        <ArrowUpwardIcon
                          onClick={() => setSortDirection('desc')}
                          className={classes.dropArrow}
                        />
                      )}
                    </>
                  )}
                  variant="outlined"
                  classes={{
                    select: classes.select,
                  }}
                  MenuProps={{
                    classes: {
                      paper: classes.selectMenu,
                    },
                  }}
                  aria-label={filter?.description}
                  renderValue={renderValue}
                >
                  {filter?.options.map(({ id, name }) => (
                    <MenuItem
                      key={_.uniqueId()}
                      value={id}
                      classes={{
                        root: classes.menuItem,
                      }}
                    >
                      {sort === id ? <CheckIcon /> : null}
                      {name}
                    </MenuItem>
                  ))}
                </Select>
              </FilterWrapper>
            );
          }
          return null;
        })}
        {hasActiveFilters && !isMobile && (
          <Button
            className={classes.clearFilter}
            style={{ marginBottom: 0, marginLeft: 35 }}
            onClick={clearFilters}
          >
            <CloseIcon />
            {t('clearFilter')}
          </Button>
        )}
      </div>
      {hasActiveFilters && isMobile && (
        <Button className={classes.clearFilter} onClick={clearFilters}>
          <CloseIcon />
          {t('clearFilter')}
        </Button>
      )}
    </>
  );
};

const styled = withStyles(styles)(RenderFilters);

export default styled;
