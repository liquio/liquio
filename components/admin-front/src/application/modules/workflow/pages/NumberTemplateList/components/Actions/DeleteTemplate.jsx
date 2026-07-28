import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { translate } from 'react-translate';
import ConfirmDialog from 'components/ConfirmDialog';
import promiseChain from 'helpers/promiseChain';

const styles = {
  root: {
    color: '#ff0000',
  },
};

const DeleteTemplate = ({
  t,
  classes,
  template,
  actions: { deleteNumberTemplate, onRowsSelect, load },
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Tooltip title={t('DeleteTemplate')}>
        <IconButton
          className={classes.root}
          onClick={() => {
            setOpen(true);
          }}
          size="large"
        >
          <DeleteOutlineIcon />
        </IconButton>
      </Tooltip>
      <ConfirmDialog
        open={open}
        handleClose={() => setOpen(false)}
        darkTheme={true}
        handleConfirm={() =>
          promiseChain(
            [
              deleteNumberTemplate,
              () => onRowsSelect([]),
              () => setOpen(false),
              load,
            ],
            template.id,
          )
        }
        title={t('DeleteTemplateDialogTitle')}
        description={t('DeleteTemplateDialogDescription')}
      />
    </>
  );
};

const styled = withStyles(styles)(DeleteTemplate);
export default translate('NumberTemplateListPage')(styled);
