import React from 'react';
import TimeLabel from 'components/Label/Time';
import { formatUserName } from 'helpers/userName';
import { Link } from 'react-router-dom';
import StringFilterHandler from 'components/DataTable/components/StringFilterHandler';
import FileNameColumn from 'components/FileDataTable/components/FileNameColumn';
import PerformerUsersInfo from 'application/modules/workflow/pages/WorkflowProcesses/PerformerUsersInfo';
import UsersFilterHandler from 'application/modules/workflow/pages/JournalList/components/UsersFilterHandler';

const darkTheme = true;

export default ({ t, useExternalLinks = false }) => ({
  controls: {
    pagination: true,
    toolbar: true,
    search: true,
    header: true,
    refresh: true,
    customizateColumns: true,
    presets: true,
    bottomPagination: true,
  },
  checkable: false,
  darkTheme: darkTheme,
  columns: [
    {
      id: 'documentId',
      name: t('DocumentId'),
    },
    {
      id: 'documentTemplateId',
      name: t('TaskTemplateId'),
      render: (value, { document }) => {
        const id = document?.documentTemplate?.id;
        const templateId = String(id);
        const workflowTemplateId = templateId.slice(0, templateId.length - 3);
        return (
          <Link
            to={`/workflow/journal#workflowTemplateId=${workflowTemplateId}`}
          >
            {id}
          </Link>
        );
      },
    },
    {
      id: 'documentTemplateName',
      name: t('TaskTemplateName'),
      render: (value, { document }) => document?.documentTemplate?.name,
    },
    {
      id: 'name',
      name: t('Name'),
    },
    {
      id: 'createdByInfo',
      name: t('UserName'),
      render: (createdByInfo, { createdBy }) => {
        if (!createdByInfo) {
          return createdBy;
        }

        const { userId, name } = createdByInfo;

        if (!userId) {
          return formatUserName(name);
        }

        return (
          <Link
            {...(useExternalLinks
              ? { target: '_blank', rel: 'noreferrer' }
              : {})}
            to={`/users/#id=${userId}`}
          >
            {formatUserName(name)}
          </Link>
        );
      },
    },
    {
      id: 'performerUsersInfo',
      name: t('Performer'),
      render: (performerUsersInfo) => (
        <PerformerUsersInfo
          list={performerUsersInfo.filter(({ name }) => name)}
          useExternalLinks={useExternalLinks}
        />
      ),
    },
    {
      id: 'createdAt',
      width: 160,
      sortable: true,
      padding: 'checkbox',
      name: t('CreatedAt'),
      render: (value) => <TimeLabel date={value} />,
    },
    {
      id: 'document',
      name: t('FileName'),
      padding: 'none',
      disableTooltip: true,
      render: (value, { document, document: { fileName = t('Unnamed') } }) =>
        fileName ? (
          <FileNameColumn
            name={fileName}
            item={document}
            extension={fileName.split('.').pop()}
            cutLine={true}
          />
        ) : null,
    },
  ],
  hiddenColumns: ['taskTemplateId'],
  filterHandlers: {
    documentId: (props) => (
      <StringFilterHandler
        name={t('DocumentId')}
        label={t('DocumentId')}
        variant={'outlined'}
        darkTheme={darkTheme}
        {...props}
      />
    ),
    userIdList: (props) => (
      <UsersFilterHandler
        name={t('Users')}
        label={t('Users')}
        darkTheme={darkTheme}
        {...props}
      />
    ),
  },
});
