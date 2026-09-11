import React from 'react';
import { history } from 'store';
import FontDownloadIcon from '@mui/icons-material/FontDownload';
import StringFilterHandler from 'components/DataTable/components/StringFilterHandler';
import MultiSelectFilterHandler from 'components/DataTable/components/MultiSelectFilterHandler';
import ToggleFilter from 'components/DataTable/components/ToggleFilter';
import WorkflowActions from '../components/WorkflowActions';
import SelectFilterHandler from 'components/DataTable/components/SelectFilterHandler';
import Favorites from 'application/modules/workflow/pages/WorkflowList/components/Favorites';
import RenderOneLine from 'helpers/renderOneLine';
import renderHTML from 'helpers/renderHTML';
import moment from 'moment';

const darkTheme = true;

const styles = {
  searchResultsWrapper: {
    fontSize: 11,
    display: 'inline-block',
    marginTop: 15,
  },
  alignIcons: {
    verticalAlign: 'top',
    paddingTop: 3,
  },
  verticalAlign: {
    verticalAlign: 'top',
  },
  value: {
    lineHeight: '17px',
    margin: '0 0 6px 0',
  },
  subtext: {
    fontSize: '12px',
    lineHeight: '18px',
    opacity: '.7',
    margin: 0,
  },
  date: {
    whiteSpace: 'nowrap',
  },
  tagName: {
    color: 'rgba(255, 255, 255, .7)',
    borderRadius: '48px',
    fontSize: '12px',
    lineHeight: '14px',
    textAlign: 'center',
    padding: '1px 6px',
    height: 18,
    cursor: 'pointer',
  },
  tagLink: {
    textDecoration: 'none',
  },
  tagsWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    height: '18px',
    overflow: 'hidden',
  },
};
export default ({
  t,
  actions,
  readOnly,
  search,
  SEARCH_KEYS,
  subscribeEnabled,
  userUnits,
  workflows,
  tags,
  isTestProcesses,
  tagsRef,
  moreTagsRef
}) => {
  const searchByCode = (search || '').length;

  const applyOpacity = (color, opacity) => {
    return color.replace(/[\d\.]+\)$/g, `${opacity})`);
  };

  const handleClick = (tag) => {
    setTimeout(() => {
      history.push(`/${isTestProcesses ? 'workflow_test' : 'workflow'}/?#tags=[${tag.id}]`)
    }, 0);
  };

  const filterHandlers = {
    id: (props) => (
      <SelectFilterHandler
        name={t('WorkflowName')}
        label={t('WorkflowName')}
        chipLabel={t('WorkflowName')}
        placeholder={t('WorkflowNamePlaceholder')}
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
    search: (props) => (
      <StringFilterHandler
        name={t('WorkflowCodeSearch')}
        label={t('WorkflowCodeSearch')}
        chipLabel={t('WorkflowCodeSearch')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
  };

  const hasAccess = userUnits.map(({ id }) => id).includes(1000003);

  if (hasAccess) {
    filterHandlers.errorsSubscribers = (props) => (
      <ToggleFilter
        name={t('WorkflowSubscribed')}
        label={t('WorkflowSubscribed')}
        chipLabel={t('WorkflowSubscribed')}
        darkTheme={darkTheme}
        variant="outlined"
        replaceSpaces={true}
        {...props}
      />
    );
  }

  const hasAccessTags = userUnits.some(({ id }) => [1000003, 1000002].includes(id));

  if (hasAccessTags) {
    filterHandlers.tags = (props) => (
      <MultiSelectFilterHandler
        name={t('Tags')}
        label={t('Tags')}
        chipLabel={t('Tags')}
        darkTheme={darkTheme}
        variant="outlined"
        options={tags}
        placeholder={t('TagsSearch')}
        {...props}
      />
    );
  }

  const filterHandlersByCode = {
    search: (props) => (
      <StringFilterHandler
        name={t('WorkflowCodeSearch')}
        label={t('WorkflowCodeSearch')}
        chipLabel={t('WorkflowCodeSearch')}
        darkTheme={darkTheme}
        variant="outlined"
        {...props}
      />
    ),
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
    checkable: true,
    darkTheme: darkTheme,
    columns: [
      {
        id: 'favorite',
        disableClick: true,
        style: searchByCode ? styles.alignIcons : null,
        render: (value, row) => (
          <Favorites element={row} type={'workflow_templates'} />
        ),
      },
      {
        id: 'name',
        align: 'left',
        sortable: true,
        disableTooltip: searchByCode,
        name: t('WorkflowName'),
        style: searchByCode ? styles.verticalAlign : null,
        render: (value, { meta, id, tags }) => (
          <>
            <RenderOneLine title={value} />
            {SEARCH_KEYS.some((key) => meta[key]) ? (
              <>
                <span style={styles.searchResultsWrapper}>
                  {SEARCH_KEYS.map((key) => {
                    const screenSpecialCharacters = (str) => {
                      // eslint-disable-next-line no-useless-escape
                      return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    };

                    const title = (meta[key] || '').replace(
                      new RegExp(screenSpecialCharacters(`${search}`), 'gi'),
                      `<mark>${search}</mark>`,
                    );

                    return <>{meta[key] ? renderHTML(title) : null}</>;
                  })}
                </span>
              </>
            ) : null}
            <div style={styles.tagsWrap} ref={el => tagsRef.current[id] = el}>
              <p style={styles.subtext}>{id}</p>
              {tags ? tags.map(tag => (

                <div
                  key={tag.id || tag.name}
style={{
                  backgroundColor: applyOpacity(tag.color, 0.2),
                  border: `1px solid ${applyOpacity(tag.color, 0.4)}`,
                  ...styles.tagName
                }}
                  onClick={() => { handleClick(tag) }}
                >
                  {tag.name}
                </div>
              )) : null}
            </div>
            {tags?.length ? <div
style={{
              backgroundColor: 'rgba(128,128,128,.2)',
              border: '1px solid  \'rgba(128,128,128,.4)\'',
              display: 'none',
              ...styles.tagName,
            }}
              ref={el => moreTagsRef.current[id] = el}
            >
              ...
            </div> : null}

          </>
        ),
      },
      {
        id: 'createdAt',
        align: 'left',
        sortable: true,
        name: t('CreatedAt'),
        style: searchByCode ? styles.verticalAlign : null,
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
        style: searchByCode ? styles.verticalAlign : null,
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
        id: 'updatedByName',
        sortable: true,
        name: t('UpdatedBy'),
        style: searchByCode ? styles.verticalAlign : null,
      },
      {
        id: 'actions',
        align: 'left',
        padding: 'checkbox',
        name: t('Actions'),
        disableClick: true,
        style: searchByCode ? styles.alignIcons : null,
        render: (value, workflow) => (
          <WorkflowActions
            actions={actions}
            workflow={workflow}
            readOnly={readOnly}
            subscribeEnabled={subscribeEnabled}
          />
        ),
      },
    ],
    filterHandlers: searchByCode ? filterHandlersByCode : filterHandlers,
  };
};
