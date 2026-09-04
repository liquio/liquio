import React from 'react';
import { Chip } from '@mui/material';
import { getShortNameFromString } from 'helpers/getUserShortName';
import checkAccess from 'helpers/checkAccess';
import StringFilterHandler from 'components/DataTable/components/StringFilterHandler';
import SelectFilterHandler from 'components/DataTable/components/SelectFilterHandler';
import DateFilterHandler from 'components/DataTable/components/DateFilterHandler';

import ErrorIcon from '@mui/icons-material/Error';
import LabelIcon from '@mui/icons-material/Label';
import FontDownloadIcon from '@mui/icons-material/FontDownload';
import LooksOneIcon from '@mui/icons-material/LooksOne';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import calendarEdiIcon from 'assets/img/bx_calendar-edit.svg';

import UsersFilterHandler from './../components/UsersFilterHandler';
import statuses from './statuses';
import withErrors from './withErrors';
import moment from 'moment';

const colors = {
  1: '#1DAEFF',
  2: '#75B243',
  3: '#bf3229',
  doing: '#1DAEFF',
  done: '#75B243',
  rejected: '#bf3229',
  null: '#848788',
};

const statuslabelStyle = {
  cursor: 'inherit',
  color: '#fff',
  fontStyle: 'normal',
  fontWeight: 500,
  fontSize: 12,
  lineHeight: '14px',
  padding: '1px 0',
  boxSizing: 'content-box',
};

const styles = {
  value: {
    lineHeight: '17px',
    margin: '0 0 6px 0',
  },
  subtext: {
    fontSize: '12px',
    lineHeight: '15px',
    opacity: '.7',
    margin: 0,
  },
  date: {
    whiteSpace: 'nowrap',
  },
};

export default ({
  t,
  userUnits,
  userInfo,
  CustomToolbar,
  allowedFilters,
  darkTheme,
  workflows,
}) => {
  let filterHandlers = {
    hasUnresolvedErrors: (props) => (
      <SelectFilterHandler
        name={t('ShowingProcesses')}
        chipLabel={t('ShowingProcessesPlaceholder')}
        label={t('ShowingProcessesPlaceholder')}
        options={withErrors}
        darkTheme={darkTheme}
        listDisplay={true}
        IconComponent={(props) => <ErrorIcon {...props} />}
        {...props}
      />
    ),
    workflowTemplateId: (props) => (
      <SelectFilterHandler
        name={t('WorkflowTemplate')}
        label={t('WorkflowTemplatePlaceholder')}
        chipLabel={t('WorkflowTemplatePlaceholder')}
        placeholder={t('ProcessNamePlaceholder')}
        darkTheme={darkTheme}
        variant="outlined"
        listDisplay={true}
        searchField={true}
        useOwnNames={true}
        options={workflows}
        IconComponent={(props) => <FontDownloadIcon {...props} />}
        renderListText={({ id, name }) => name + ' - ' + id}
        {...props}
      />
    ),
    number: (props) => (
      <StringFilterHandler
        name={t('WorkflowNumber')}
        label={t('WorkflowNumberPlaceholder')}
        chipLabel={t('WorkflowNumberPlaceholder')}
        darkTheme={darkTheme}
        variant="outlined"
        IconComponent={(props) => <LooksOneIcon {...props} />}
        {...props}
      />
    ),
    userData: (props) => (
      <UsersFilterHandler
        name={t('UserName')}
        label={t('UserNamePlaceholder')}
        darkTheme={darkTheme}
        {...props}
      />
    ),
    workflowStatusId: (props) => (
      <SelectFilterHandler
        name={t('WorkflowStatusLabel')}
        label={t('WorkflowStatusPlaceholder')}
        options={statuses}
        darkTheme={darkTheme}
        listDisplay={true}
        IconComponent={(props) => <LabelIcon {...props} />}
        {...props}
      />
    ),
    from_created_at: (props) => (
      <DateFilterHandler
        name={t('CreatedDateFrom')}
        label={t('CreatedDateFrom')}
        darkTheme={darkTheme}
        IconComponent={(props) => <CalendarTodayIcon {...props} />}
        {...props}
      />
    ),
    to_created_at: (props) => (
      <DateFilterHandler
        name={t('CreatedDateTo')}
        label={t('CreatedDateTo')}
        darkTheme={darkTheme}
        IconComponent={(props) => <CalendarTodayIcon {...props} />}
        {...props}
      />
    ),
    from_updated_at: (props) => (
      <DateFilterHandler
        name={t('UpdatedDateFrom')}
        label={t('UpdatedDateFrom')}
        darkTheme={darkTheme}
        IconComponent={(props) => (
          <img
            style={{ left: '-2px', position: 'relative' }}
            {...props}
            src={calendarEdiIcon}
            alt="elasticSettings"
          />
        )}
        {...props}
      />
    ),
    to_updated_at: (props) => (
      <DateFilterHandler
        name={t('UpdatedDateTo')}
        label={t('UpdatedDateTo')}
        darkTheme={darkTheme}
        IconComponent={(props) => (
          <img
            style={{ left: '-2px', position: 'relative' }}
            {...props}
            src={calendarEdiIcon}
            alt="elasticSettings"
          />
        )}
        {...props}
      />
    ),
  };

  if (allowedFilters) {
    filterHandlers = Object.keys(filterHandlers).reduce((acc, filter) => {
      if (!allowedFilters.includes(filter)) {
        return acc;
      }

      return { ...acc, [filter]: filterHandlers[filter] };
    }, {});
  }

  const settings = {
    controls: {
      pagination: true,
      toolbar: true,
      search: true,
      header: true,
      refresh: true,
      customizateColumns: false,
      bottomPagination: true,
    },
    CustomToolbar: CustomToolbar,
    toolbarPosition: 'start',
    checkable: true,
    searchPlaceholder: t('SearchLogs'),
    columns: [
      {
        id: 'number',
        align: 'left',
        sortable: false,
        name: t('WorkflowNumber'),
      },
      {
        id: 'lastStepLabel',
        align: 'left',
        sortable: false,
        name: t('WorkflowStatusLabel'),
        disableTooltip: true,
        padding: 'none',
        render: (
          value,
          { lastStepLabel, workflowStatusId, isDraft, statuses },
        ) => {
          if (isDraft) {
            return (
              <Chip
                style={{ ...statuslabelStyle, backgroundColor: colors[null] }}
                label={t('DraftStatus')}
              />
            );
          }

          if (lastStepLabel) {
            return (
              <Chip
                style={{
                  ...statuslabelStyle,
                  backgroundColor: colors[workflowStatusId],
                }}
                label={lastStepLabel}
              />
            );
          }

          if (statuses?.length > 0) {
            return (
              <Chip
                style={{
                  ...statuslabelStyle,
                  backgroundColor: colors[statuses[statuses.length - 1].type],
                }}
                label={statuses[statuses.length - 1].label}
              />
            );
          }

          return null;
        },
      },
      {
        id: 'workflowTemplate',
        align: 'left',
        sortable: false,
        name: t('WorkflowTemplate'),
        render: ({ name }, value) => {
          return (
            <>
              <span
                style={{
                  color: value && value.hasUnresolvedErrors ? '#f44336' : '',
                }}
              >
                {name}
              </span>
              <p style={styles.subtext}>{value.workflowTemplateId}</p>
            </>
          );
        },
      },
      {
        id: 'userData',
        align: 'left',
        sortable: false,
        name: t('UserName'),
        render: ({ userName, userId }) => {
          const isArray = Array.isArray(userName || '');

          return (
            <div>
              <p style={styles.value}>
                {getShortNameFromString(
                  isArray ? userName.join(' ') : userName,
                )}
              </p>
              <p style={styles.subtext}>{userId}</p>
            </div>
          );
        },
      },
      {
        id: 'createdAt',
        align: 'left',
        sortable: true,
        name: t('CreatedAt'),
        render: (value) => {
          return (
            <div style={styles.date}>
              <p style={styles.value}>
                {' '}
                {moment(value).format('DD.MM.YYYY HH:mm')}
              </p>
              <p style={styles.subtext}>{moment(value).fromNow()}</p>
            </div>
          );
        },
      },
      {
        id: 'updatedAt',
        align: 'left',
        sortable: true,
        name: t('UpdatedAt'),
        render: (value) => {
          return (
            <div style={styles.date}>
              <p style={styles.value}>
                {' '}
                {moment(value).format('DD.MM.YYYY HH:mm')}
              </p>
              <p style={styles.subtext}>{moment(value).fromNow()}</p>
            </div>
          );
        },
      },
    ],
    filterHandlers,
    darkTheme,
  };

  const hasUnitsAccess = checkAccess(
    {
      unitHasAccessTo: 'navigation.users.Users',
    },
    userInfo || {},
    userUnits || {},
  );

  if (!hasUnitsAccess) {
    delete settings.filterHandlers.userData;
  }

  return settings;
};
