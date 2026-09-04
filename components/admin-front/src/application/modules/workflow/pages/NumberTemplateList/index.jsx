import React from 'react';
import { translate } from 'react-translate';
import _ from 'lodash/fp';
import { connect } from 'react-redux';

import LeftSidebarLayout from 'layouts/LeftSidebar';
import ModulePage from 'components/ModulePage';
import endPoint from 'application/endPoints/numberTemplates';

import dataTableConnect from 'services/dataTable/connect';
import dataTableAdapter from 'services/dataTable/adapter';

import DataTable from 'components/DataTable';
import checkAccess from 'helpers/checkAccess';

import CreateNewTemplate from './components/CreateNewTemplate';
import DeleteTemplates from './components/DeleteTemplates';
import dataTableSettings from './variables/dataTableSettings';

class NumberTemplateListPage extends ModulePage {
  componentDidMount = () => {
    super.componentDidMount();
    const { actions } = this.props;
    actions.load();
  };

  renderToolBar = () => {
    const { rowsSelected } = this.props;

    return (
      <>
        {(rowsSelected || []).length ? <DeleteTemplates {...this.props} /> : null}
        <CreateNewTemplate {...this.props} />
      </>
    );
  };

  render() {
    const { t, title, loading, location, actions, userInfo, userUnits } = this.props;

    const isEditable = checkAccess({ userHasUnit: [1000002] }, userInfo, userUnits);

    const settings = dataTableSettings({ t, actions, readOnly: false });

    return (
      <LeftSidebarLayout location={location} title={t(title)} loading={loading}>
        <DataTable
          {..._.merge(settings, dataTableAdapter(this.props))}
          CustomToolbar={isEditable && this.renderToolBar}
        />
      </LeftSidebarLayout>
    );
  }
}

const mapState = ({ auth: { info, userUnits } }) => ({
  userInfo: info,
  userUnits
});

const translated = translate('NumberTemplateListPage')(NumberTemplateListPage);

const connected = connect(mapState)(translated);

export default dataTableConnect(endPoint)(connected);
