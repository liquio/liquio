import React from 'react';
import { translate } from 'react-translate';
import _ from 'lodash/fp';

import DataGrid from 'components/DataGridPremium';
import EmptyPage from 'components/EmptyPage';
import endPoint from 'application/endPoints/message';
import dataTableConnect from 'services/dataTable/connect';
import dataTableAdapter from 'services/dataTable/adapter';
import { ReactComponent as MessageIcon } from 'assets/img/emptyScreens/messages.svg';
import dataTableSettings from '../variables/dataTableSettings';
import controls from 'components/DataGridPremium/components/defaultProps';

const filtersToExclude = ['from_created_at', 'to_created_at'];

const MessageTable = (props) => {
  const {
    t,
    data,
    loading,
    actions: { load },
    handleItemClick,
    count,
    TableToolbar,
    setTitle,
    filters
  } = props;
  const renderCount = React.useRef(0);

  const isFiltered = React.useMemo(() => {
    return filtersToExclude.find((filter) => {
      const isKey = filter in filters;
      return isKey && filters[filter];
    });
  }, [filters]);

  const emptyResults = React.useMemo(
    () => renderCount.current === 0 && count === 0 && !isFiltered,
    [renderCount, count, isFiltered]
  );

  React.useEffect(() => {
    if (count === 0) {
      renderCount.current++;
    }
  }, [count]);

  React.useEffect(() => {
    if (emptyResults) {
      setTitle('');
    }
  }, [setTitle, emptyResults]);

  if (emptyResults) {
    return (
      <EmptyPage
        title={t('EmptyListTitle')}
        description={t('EmptyListDescription')}
        Icon={MessageIcon}
      />
    );
  }

  const localeText = {
    noRowsLabel: t('noMessages')
  };

  const settings = dataTableSettings({ t, actions: { load } });

  const highlight = (data || []).filter(({ isRead }) => !isRead).map(({ id }) => id);

  return (
    <DataGrid
      rows={data}
      columns={settings.columns}
      controls={controls}
      localeText={localeText}
      highlight={highlight}
      loading={loading}
      onRowClick={handleItemClick}
      CustomToolbar={TableToolbar}
      startPage={endPoint?.startPage}
      {..._.merge(settings, dataTableAdapter(props))}
    />
  );
};

const translated = translate('MessageListPage')(MessageTable);

export default dataTableConnect(endPoint)(translated);
