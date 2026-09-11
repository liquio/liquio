import React from 'react';

import { ListItemIcon, MenuItem, Typography } from '@mui/material';
import { useTranslate } from 'react-translate';

import SchemaFormModal from 'components/JsonSchema/components/SchemaFormModal';

// import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PlayArrowOutlined from '@mui/icons-material/PlayArrowOutlined';

const RenderTemplateItem = ({ report, handleClose, handleRenderReport }) => {
  const t = useTranslate('ReportListPage');
  const [openEditDialog, setOpenEditDialog] = React.useState(false);

  return (
    <>
      <MenuItem
        onClick={() => {
          handleClose();
          setOpenEditDialog(true);
        }}
      >
        <ListItemIcon>
          <PlayArrowOutlined fontSize="small" />
        </ListItemIcon>
        <Typography variant="inherit">{t('Render')}</Typography>
      </MenuItem>

      {openEditDialog ? (
        <SchemaFormModal
          clean={false}
          open={openEditDialog}
          value={{
            reportTemplateId: report.id,
            name: report.data.name,
            meta: {},
            variables: {},
            filters: {},
          }}
          schema={{
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: t('ReportName'),
              },
              ...(report.data.schema
                ? {
                    label: {
                      control: 'text.block',
                      htmlBlock: `
                        <span style="color: #fff;font-size: 16px;line-height: 19px;margin-bottom: 0px; font-weight: 500;display: inline-block;">
                            ${t('Filters')}
                        </span>
                    `,
                    },
                    divider: {
                      control: 'divider',
                      darkTheme: true,
                      margin: 12,
                    },
                    filters: report.data.schema,
                  }
                : {}),
            },
            required: ['name', report.data.schema && 'filters'].filter(Boolean),
          }}
          title={t('RenderReport')}
          saveButtonText={t('Render')}
          onClose={() => setOpenEditDialog(false)}
          translateError={t}
          onChange={handleRenderReport}
        />
      ) : null}
    </>
  );
};

export default RenderTemplateItem;
