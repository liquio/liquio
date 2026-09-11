import React from 'react';
import { translate } from 'react-translate';
import _ from 'lodash/fp';
import { connect } from 'react-redux';

import LeftSidebarLayoutRaw from 'layouts/LeftSidebar';
import ModulePage, { type ModulePageProps } from 'components/ModulePage';
import endPoint from 'application/endPoints/numberTemplates';

import dataTableConnect from 'services/dataTable/connect';
import dataTableAdapter from 'services/dataTable/adapter';

import DataTableRaw from 'components/DataTable';
import checkAccess from 'helpers/checkAccess';

import CreateNewTemplateRaw from './components/CreateNewTemplate';
import DeleteTemplatesRaw from './components/DeleteTemplates';
import dataTableSettings from './variables/dataTableSettings';

const LeftSidebarLayout = LeftSidebarLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DataTable = DataTableRaw as unknown as React.ComponentType<Record<string, unknown>>;
const CreateNewTemplate = CreateNewTemplateRaw as unknown as React.ComponentType<Record<string, unknown>>;
const DeleteTemplates = DeleteTemplatesRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface Unit {
  id: number;
  [key: string]: unknown;
}

interface NumberTemplateListPageProps extends ModulePageProps {
  loading?: boolean;
  location: unknown;
  actions: {
    load: () => void;
    [key: string]: unknown;
  };
  userInfo: Record<string, unknown>;
  userUnits: Unit[];
  rowsSelected?: unknown[];
}

class NumberTemplateListPage extends ModulePage<NumberTemplateListPageProps> {
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

    const isEditable = checkAccess({ userHasUnit: [1000002] }, userInfo, userUnits as never);

    const settings = dataTableSettings({ t, actions, readOnly: false } as never);

    return (
      <LeftSidebarLayout location={location} title={t?.(title as string)} loading={loading}>
        <DataTable
          {..._.merge(settings, dataTableAdapter(this.props as never, endPoint as never))}
          CustomToolbar={isEditable && this.renderToolBar}
        />
      </LeftSidebarLayout>
    );
  }
}

interface ConnectedState {
  auth: { info: Record<string, unknown>; userUnits: Unit[] };
}

const mapState = ({ auth: { info, userUnits } }: ConnectedState) => ({
  userInfo: info,
  userUnits
});

const translated = translate('NumberTemplateListPage')(NumberTemplateListPage as never);

const connected = connect(mapState)(translated as never);

export default dataTableConnect(endPoint as never)(connected as never);
