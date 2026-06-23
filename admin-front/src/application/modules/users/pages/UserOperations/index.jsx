import React from 'react';
import { translate } from 'react-translate';

import DataTable from 'components/DataTable';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import useTable from 'services/dataTable/useTable';

import endPoint from 'application/endPoints/userOperations';
import urlHashParams from 'helpers/urlHashParams';

import asModulePage from 'hooks/asModulePage';

import dataTableSettings from './dataTableSettings';
import { getActionTypeTranslations } from './helpers';

import { connect } from 'react-redux';

const UserLoginJournal = ({ t, title, location }) => {
  const settings = dataTableSettings({ t });
  const actionTypesTranslations = getActionTypeTranslations(t);

  const tableData = useTable(endPoint, {
    filters: urlHashParams(),
    hiddenColumns: settings.hiddenColumns
  });

  const mappedData = React.useMemo(() => {
    return tableData.data?.map(({ actionType, ...rest }) => ({
      ...rest,
      actionType: actionTypesTranslations.find(({ id }) => id === actionType)?.name
    }));
  }, [tableData, actionTypesTranslations]);

  return (
    <LeftSidebarLayout location={location} title={t(title)} loading={tableData.loading}>
      <DataTable {...settings} {...tableData} data={mappedData} />
    </LeftSidebarLayout>
  );
};

const modulePage = asModulePage(UserLoginJournal);

const translated = translate('UserLoginJournal')(modulePage);

const mapStateToProps = ({ auth: { userUnits, info: userInfo } }) => ({
  userUnits,
  userInfo
});

export default connect(mapStateToProps, null)(translated);
