import React from 'react';
import FontDownloadIcon from '@mui/icons-material/FontDownload';
import SelectFilterHandler from 'components/DataTable/components/SelectFilterHandler';
import moment from 'moment';

const darkTheme = true;

const styles = {
  tagName: {
    display: 'inline-block',
    color: 'rgba(255, 255, 255, .7)',
    borderRadius: '48px',
    fontSize: '12px',
    lineHeight: '14px',
    textAlign: 'center',
    padding: '1px 6px',
    height: 18,
  },
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
  workflowTagsAll
}) => {
  const filterHandlers = {
    search: (props) => (
      <SelectFilterHandler
        name={t('SearchByTagName')}
        label={t('SearchByTagName')}
        chipLabel={t('SearchByTagName')}
        placeholder={t('SearchByTagNamePlaceholder')}
        darkTheme={darkTheme}
        variant="outlined"
        listDisplay={true}
        searchField={true}
        useOwnNames={true}
        options={workflowTagsAll}
        IconComponent={(props) => <FontDownloadIcon {...props} />}
        renderListText={({ name }) => name}
        {...props}
      />
    ),
  };

  const applyOpacity = (color, opacity) => {
    return color.replace(/[\d\.]+\)$/g, `${opacity})`);
  };

  return {
    controls: {
      pagination: true,
      toolbar: true,
      search: true,
      header: true,
      refresh: true,
      customizateColumns: false,
      bottomPagination: true,
    },
    checkable: false,
    darkTheme: darkTheme,
    columns: [
      {
        id: 'name',
        align: 'left',
        sortable: true,
        name: t('TagName'),
        render: (_, { id, name, color }) => (
          <div
            style={{
              backgroundColor: applyOpacity(color, 0.2),
              border: `1px solid ${applyOpacity(color, 0.4)}`,
              ...styles.tagName,
            }}
            id={id}
            className=""
          >
            {name}
          </div>
        ),
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
      {
        id: 'updatedBy',
        sortable: true,
        name: t('UpdatedBy'),
      },
    ],
    filterHandlers,
  };
};
