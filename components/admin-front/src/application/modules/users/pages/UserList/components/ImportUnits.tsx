import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Tooltip, IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { importUnits } from 'application/actions/units';

import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ConfirmDialogRaw from 'components/ConfirmDialog';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = {
  buttonPadding: {
    marginLeft: 10,
  },
};

interface ImportUnitsProps {
  t: (key: string) => string;
  classes: Record<string, string>;
  actions: { load: () => void };
  importActions: {
    importUnits: (file: File, force?: boolean) => Promise<Error | unknown>;
    addMessage: (message: unknown) => void;
  };
}

interface ImportUnitsState {
  openConfirmDialog: boolean;
  target?: { files: FileList };
}

class ImportUnits extends React.Component<ImportUnitsProps, ImportUnitsState> {
  input: HTMLInputElement | null = null;

  state: ImportUnitsState = { openConfirmDialog: false };

  handleOpenConfirmDialog = () => this.setState({ openConfirmDialog: true });

  handleCloseConfirmDialog = () => this.setState({ openConfirmDialog: false });

  handleUploadClick = () => this.input && this.input.click();

  handleChange = async ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ target: target as unknown as { files: FileList } });
    const { actions, importActions } = this.props;
    const importResult = await importActions.importUnits((target.files as FileList)[0]);
    if (importResult instanceof Error) {
      importResult.message === 'Unit already exists.'
        ? this.handleOpenConfirmDialog()
        : importActions.addMessage(new Message('InvalidFile', 'error'));
      return;
    }
    importActions.addMessage(new Message('ImportUnitsSuccess', 'success'));
    actions.load();
  };

  handleChangeConfirm = async () => {
    const { actions, importActions } = this.props;
    const { target } = this.state;
    const importResult = await importActions.importUnits((target as { files: FileList }).files[0], true);
    if (importResult instanceof Error) {
      importActions.addMessage(new Message('FailImportingUnits', 'error'));
      return;
    }
    this.handleCloseConfirmDialog();
    importActions.addMessage(new Message('ImportUnitsSuccess', 'success'));
    actions.load();
    this.setState({ target: undefined });
  };

  render() {
    const { t, classes } = this.props;
    const { openConfirmDialog } = this.state;
    return (
      <>
        <Tooltip className={classes.buttonPadding} title={t('ImportUnits')}>
          <IconButton
            onClick={this.handleUploadClick}
            id="export-units"
            size="large"
          >
            <CloudUploadIcon />
          </IconButton>
        </Tooltip>
        <input
          ref={(ref) => {
            this.input = ref;
          }}
          type="file"
          accept=".bpmn, application/bpmn"
          onChange={this.handleChange}
          hidden={true}
          multiple={false}
        />
        <ConfirmDialog
          fullScreen={false}
          open={openConfirmDialog}
          darkTheme={true}
          title={t('OverwriteUnitsConfirmation')}
          description={t('OverwriteUnitsConfirmationText')}
          handleClose={this.handleCloseConfirmDialog}
          handleConfirm={this.handleChangeConfirm}
        />
      </>
    );
  }
}

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  importActions: {
    importUnits: bindActionCreators(importUnits, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});

const translated = translate('UnitsListPage')(ImportUnits as never);
const styled = withStyles(styles)(translated as never);
export default connect(mapStateToProps, mapDispatchToProps)(styled as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
