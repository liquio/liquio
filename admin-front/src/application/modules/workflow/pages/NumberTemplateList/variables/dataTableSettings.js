import React from 'react';
import TimeLabel from 'components/Label/Time';
import StringFilterHandler from 'components/DataTable/components/StringFilterHandler';
import TemplateActions from '../components/Actions';

const darkTheme = true;

export default ({ t, actions, readOnly }) => {
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
        render: (value) => <TimeLabel date={value} />,
      },
      {
        id: 'updatedAt',
        width: 160,
        align: 'center',
        sortable: 'true',
        padding: 'checkbox',
        name: t('UpdatedAt'),
        render: (value) => <TimeLabel date={value} />,
      },
      {
        id: 'actions',
        width: 100,
        sortable: false,
        padding: 'checkbox',
        hiddable: false,
        disableClick: true,
        name: t('Actions'),
        render: (value, template) => (
          <TemplateActions
            template={template}
            actions={actions}
            readOnly={readOnly}
          />
        ),
      },
    ],
    filterHandlers: {
      id: (props) => (
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
