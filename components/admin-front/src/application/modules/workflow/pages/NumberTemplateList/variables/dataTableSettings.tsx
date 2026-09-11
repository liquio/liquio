import React from 'react';
import TimeLabelRaw from 'components/Label/Time';
import StringFilterHandlerRaw from 'components/DataTable/components/StringFilterHandler';
import TemplateActionsRaw from '../components/Actions';

const TimeLabel = TimeLabelRaw as unknown as React.ComponentType<Record<string, unknown>>;
const StringFilterHandler = StringFilterHandlerRaw as unknown as React.ComponentType<Record<string, unknown>>;
const TemplateActions = TemplateActionsRaw as unknown as React.ComponentType<Record<string, unknown>>;

const darkTheme = true;

interface NumberTemplate {
  id?: string | number;
  name?: string;
}

interface DataTableSettingsParams {
  t: (key: string) => string;
  actions: Record<string, unknown>;
  readOnly?: boolean;
}

export default ({ t, actions, readOnly }: DataTableSettingsParams) => {
  return {
    controls: {
      pagination: true,
      toolbar: true,
      search: true,
      header: true,
      refresh: true,
      customizateColumns: true,
      bottomPagination: true,
    },
    checkable: !readOnly,
    darkTheme: darkTheme,
    columns: [
      {
        id: 'name',
        align: 'left',
        sortable: true,
        name: t('NumberTemplateName'),
      },
      {
        id: 'id',
        align: 'left',
        sortable: true,
        name: t('TemplateId'),
      },
      {
        id: 'createdAt',
        width: 160,
        align: 'center',
        sortable: 'true',
        padding: 'checkbox',
        name: t('CreatedAt'),
        render: (value: string) => <TimeLabel date={value} />,
      },
      {
        id: 'updatedAt',
        width: 160,
        align: 'center',
        sortable: 'true',
        padding: 'checkbox',
        name: t('UpdatedAt'),
        render: (value: string) => <TimeLabel date={value} />,
      },
      {
        id: 'actions',
        width: 100,
        sortable: false,
        padding: 'checkbox',
        hiddable: false,
        disableClick: true,
        name: t('Actions'),
        render: (value: unknown, template: NumberTemplate) => (
          <TemplateActions
            template={template}
            actions={actions}
            readOnly={readOnly}
          />
        ),
      },
    ],
    filterHandlers: {
      id: (props: Record<string, unknown>) => (
        <StringFilterHandler
          name={t('TemplateId')}
          label={t('TemplateId')}
          variant={'outlined'}
          darkTheme={darkTheme}
          {...props}
        />
      ),
    },
  };
};
