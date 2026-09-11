import React from 'react';
import { ListItemIcon, MenuItem, Typography } from '@mui/material';
import { useTranslate } from 'react-translate';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

import schema from 'modules/kibana/pages/KibanaReportList/variables/reportSchema';
import SchemaFormModal from 'components/JsonSchema/components/SchemaFormModal';
import UnitList from 'application/modules/users/pages/Unit/components/UnitList';

const EditTemplateItem = ({ report, handleClose, handleChangeReport }) => {
  const t = useTranslate('KibanaReports');
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <MenuItem
        onClick={() => {
          handleClose();
          setOpen(true);
        }}
      >
        <ListItemIcon>
          <EditOutlinedIcon />
        </ListItemIcon>
        <Typography variant="inherit">{t('Edit')}</Typography>
      </MenuItem>

      {open ? (
        <SchemaFormModal
          open={open}
          value={report}
          darkTheme={true}
          schema={schema({ t })}
          title={t('EditReport')}
          onClose={() => setOpen(false)}
          translateError={t}
          onChange={handleChangeReport}
          customControls={{ UnitList }}
        />
      ) : null}
    </>
  );
};

export default EditTemplateItem;
