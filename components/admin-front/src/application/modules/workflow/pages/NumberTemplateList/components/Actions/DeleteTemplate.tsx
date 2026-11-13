import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { translate } from 'react-translate';
import ConfirmDialogRaw from 'components/ConfirmDialog';
import promiseChain from 'helpers/promiseChain';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  root: {
    color: '#ff0000',
  },
};

interface NumberTemplate {
  id?: string | number;
  name?: string;
}

interface DeleteTemplateProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  template: NumberTemplate;
  actions: {
    deleteNumberTemplate: (id?: string | number) => Promise<unknown>;
    onRowsSelect: (rows: unknown[]) => void;
    load: () => void;
  };
}

const DeleteTemplate = ({
  t,
  classes,
  template,
  actions: { deleteNumberTemplate, onRowsSelect, load },
}: DeleteTemplateProps) => {
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
            ] as never,
            template.id as never,
          )
        }
        title={t('DeleteTemplateDialogTitle')}
        description={t('DeleteTemplateDialogDescription')}
      />
    </>
  );
};

const styled = withStyles(styles)(DeleteTemplate as never);
export default translate('NumberTemplateListPage')(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
