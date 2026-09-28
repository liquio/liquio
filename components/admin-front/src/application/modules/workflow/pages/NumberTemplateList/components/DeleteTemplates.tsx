import React from 'react';
import { translate } from 'react-translate';
import { Tooltip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import asyncFilter from 'helpers/asyncFilter';
import ConfirmDialogRaw from 'components/ConfirmDialog';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface DeleteTemplatesProps {
  t: (key: string) => string;
  actions: {
    deleteNumberTemplate: (id: string | number) => Promise<unknown>;
    load: () => void;
  };
  rowsSelected: Array<string | number>;
}

interface DeleteTemplatesState {
  showDialog: boolean;
  loading: boolean;
}

class DeleteTemplates extends React.Component<DeleteTemplatesProps, DeleteTemplatesState> {
  constructor(props: DeleteTemplatesProps) {
    super(props);
    this.state = {
      showDialog: false,
      loading: false,
    };
  }

  deleteTemplates = async () => {
    const {
      rowsSelected,
      actions: { deleteNumberTemplate, load },
    } = this.props;

    this.setState({ loading: true });

    await asyncFilter(rowsSelected || [], async (id) => {
      await deleteNumberTemplate(id);
    });

    load();

    this.setState({
      showDialog: false,
      loading: false,
    });
  };

  render() {
    const { t } = this.props;
    const { showDialog, loading } = this.state;

    return (
      <>
        <Tooltip title={t('DeleteTemplates')}>
          <IconButton
            onClick={() => this.setState({ showDialog: true })}
            size="large"
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
        <ConfirmDialog
          loading={loading}
          open={showDialog}
          darkTheme={true}
          handleClose={() => this.setState({ showDialog: false })}
          handleConfirm={this.deleteTemplates}
          title={t('DeleteTemplateDialogTitle')}
          description={t('DeleteTemplatesDialogDescription')}
        />
      </>
    );
  }
}

export default translate('NumberTemplateListPage')(DeleteTemplates as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
