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
import withStyles, { WithStyles } from '@mui/styles/withStyles';
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
import MobileDetect from 'mobile-detect';
import styles from './styles';
import RenderPopup from './renderPopup';

const EMPTY_FILTER_VALUE = 'EMPTY_FILTER_VALUE';

interface FilterOption {
  id: unknown;
  name?: string;
  label?: string;
  stringified?: string;
}

interface Filter {
  type?: string;
  hidden?: boolean;
  variant?: string;
  description?: string;
  actionText?: string;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  changeOnBlur?: boolean;
  keys?: Record<string, Filter>;
  key?: string;
  options?: FilterOption[] | string | null;
  width?: string | number;
  dateFormat?: string;
  maxDate?: string;
  minDate?: string;
  control?: string;
  value?: unknown;
  [key: string]: unknown;
}

type FiltersClasses = Record<string, string>;

const RenderSelectFilter = ({
  filter,
  value,
  options,
  onChange,
}: {
  filter?: Filter;
  value?: unknown;
  options: FilterOption[];
  onChange: (id: unknown) => void;
}) => {
  const t = useTranslate('TaskPage');

  const getOptionLabel = (opt: FilterOption) => opt?.stringified || opt?.label || opt?.name || '';

  return (
    <Autocomplete
      value={options.find((option) => option.id === value) || null}
      options={options}
      getOptionLabel={getOptionLabel}
      onChange={(_e, value) => onChange(value?.id)}
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
}: {
  filter: Filter;
  value?: unknown;
  options?: FilterOption[] | null;
  path?: unknown[];
  onChange: (value: unknown) => void;
  autoFocus?: unknown;
  classes: FiltersClasses;
  [key: string]: unknown;
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
    (val: unknown) => {
      if (!filter.changeOnBlur) {
        onChange(val);
      }
    },
    [filter],
  );

  const onBlur = React.useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (filter.changeOnBlur) {
        onChange(val);
      }
    },
    [filter],
  );

  if (filter?.variant === 'select') {
    const getOptionLabel = (opt: FilterOption) => opt?.stringified || opt?.label || opt?.name || '';

    return (
      <Autocomplete
        value={options?.find((option) => option.id === value)}
        options={options || []}
        getOptionLabel={getOptionLabel}
        onChange={(_e, value) => onChange(value?.id)}
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
}: {
  classes: FiltersClasses;
  filter: Filter;
  filterKey: string;
  requestFilters: Record<string, unknown>;
  onFilterChange: (filters: Record<string, unknown>) => void;
  t: (key: string) => string;
  getMaxDate: (item: Filter) => unknown;
  getDateFormat: (item: Filter) => string;
  getMinDate: (item: Filter) => unknown;
}) => {
  const [error, setError] = React.useState(false);
  return (
    <DatePicker
      value={
        (requestFilters[filterKey]
          ? moment(requestFilters[filterKey] as string, getDateFormat(filter)).format(
              'YYYY-MM-DD',
            )
          : null) as never
      }
      // The installed date-picker adapter is Dayjs (see App.tsx's
      // LocalizationProvider), but this file works with `moment` throughout
      // — a pre-existing mismatch that happens to work at runtime because
      // Dayjs implements the same `isValid()`/`toDate()` method names
      // moment does. Preserved as-is rather than converted to Dayjs.
      onChange={((value: moment.Moment | null) => {
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
      }) as never}
      {...({
        error,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        renderInput: (params: any) => (
          <TextField
            {...params}
            variant="standard"
            autoComplete="off"
            inputProps={{
              ...params.inputProps,
              placeholder: t('DatePlaceholder'),
            }}
          />
        ),
        components: { OpenPickerIcon: CalendarIcon },
      } as unknown as Record<string, unknown>)}
      label={filter?.description}
      className={classes.disableTransition}
      maxDate={getMaxDate(filter) as never}
      minDate={getMinDate(filter) as never}
    />
  );
};

interface RenderFiltersProps extends WithStyles<typeof styles> {
  filters: Record<string, Filter>;
  onFilterChange: (filters: Record<string, unknown>) => void;
  requestFilters: Record<string, unknown>;
  sort?: unknown;
  setSort: (value: unknown) => void;
  sortDirection?: string;
  setSortDirection: (direction: string) => void;
  rootDocument: { data: Record<string, unknown> };
  setCurrentPage: (page: number) => void;
}

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
}: RenderFiltersProps) => {
  const [requestFilters, onFilterChange] = React.useState(requestFiltersOrigin);
  const [isMobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();
    return isMobile;
  });
  const mappedFilters = React.useMemo(() => {
    const newFilters: Record<string, Filter> = {};
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

  let [timeout] = React.useState<ReturnType<typeof setTimeout> | null>(null);

  const keys = React.useMemo(() => Object.keys(filters), [filters]);

  const FilterWrapper = React.useCallback(
    ({ filter, children }: { filter?: Filter; children?: React.ReactNode }) => (
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
    (item?: Filter): FilterOption[] | null => {
      let options = null;

      if (typeof item?.options === 'string') {
        options = evaluate(item?.options, rootDocument.data);
      } else {
        options = item?.options;
      }

      return options as FilterOption[] | null;
    },
    [rootDocument],
  );

  const getMaxDate = React.useCallback(
    (item?: Filter) => {
      if (typeof item?.maxDate === 'string') {
        return evaluate(item?.maxDate, rootDocument.data);
      }
      return '';
    },
    [rootDocument],
  );

  const getDateFormat = React.useCallback((item?: Filter) => {
    if (typeof item?.dateFormat === 'string') {
      return item?.dateFormat;
    }
    return 'DD.MM.YYYY';
  }, []);

  const getMinDate = React.useCallback(
    (item?: Filter) => {
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
    cleenDeep(requestFiltersOrigin) as Record<string, unknown>,
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
              ...filter?.keys?.[key],
              key,
            }));

            const StringElementComponent = (props?: Record<string, unknown>) => (
              <>
                {multiFilters.length > 0 ? (
                  <>
                    {multiFilters.map((multiFilter, index) => (
                      <div
                        className={classNames({
                          [classes.multiFiltersItem]:
                            index !== multiFilters.length - 1,
                        })}
                        key={`${multiFilter.key}-${_.uniqueId()}`}
                      >
                        {multiFilter.control === 'date' ? (
                          <RenderDatePickers
                            {...props}
                            classes={classes}
                            filter={multiFilter}
                            filterKey={multiFilter?.key as string}
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
                            value={requestFilters[multiFilter.key as string]}
                            options={getOptions(multiFilter)}
                            path={[multiFilter.key, _.uniqueId()]}
                            autoFocus={
                              multiFilter?.autoFocus ||
                              requestFilters[multiFilter.key as string]
                            }
                            onChange={(value: unknown) => {
                              onFilterChange({
                                ...requestFilters,
                                [multiFilter.key as string]: value,
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
                    onChange={(value: unknown) => {
                      if (timeout) clearTimeout(timeout);
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

            const SelectElementComponent = (props?: Record<string, unknown>) => (
              <RenderSelectFilter
                key={key}
                filter={filter}
                value={requestFilters[key]}
                options={(options || []) as FilterOption[]}
                onChange={(value: unknown) => {
                  if (timeout) clearTimeout(timeout);
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
                  actionsBlock={(callback: (() => void) | null = null) => (
                    <div className={classes.actionBlock}>
                      <Button
                        classes={{
                          // `clearButton` is never defined in `./styles` — a pre-existing
                          // dead className reference (only `clearFilter` exists), preserved
                          // as-is via cast, same pattern as other undefined-classKey quirks
                          // found throughout this migration.
                          root: (classes as Record<string, string>).clearButton,
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
                          const newFilters: Record<string, unknown> = {
                            ...requestFilters,
                          };

                          if (multiFilters.length > 0) {
                            multiFilters.forEach((multiFilter) => {
                              newFilters[multiFilter.key as string] = null;
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
                          root: (classes as Record<string, string>).clearButton,
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
                      checked={requestFilters[key] as boolean}
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
            const renderValue = (value: unknown) => {
              const chosenOption = (filter?.options as FilterOption[])?.find(
                (option) => option.id === value,
              );

              return (
                <Typography variant="body2" className={classes.sortTextWrapper}>
                  <CheckIcon className={classes.checkSortIcon} />

                  <Typography variant={'subheading2' as never}>
                    {chosenOption?.name}
                  </Typography>
                </Typography>
              );
            };

            return (
              <FilterWrapper filter={filter} key={_.uniqueId()}>
                <Select
                  value={sort as string}
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
                  {(filter?.options as FilterOption[])?.map(({ id, name }) => (
                    <MenuItem
                      key={_.uniqueId()}
                      value={id as string}
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
