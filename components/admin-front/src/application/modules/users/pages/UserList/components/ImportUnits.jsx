import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Tooltip, IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { importUnits } from 'application/actions/units';

import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ConfirmDialog from 'components/ConfirmDialog';

const styles = {
  buttonPadding: {
    marginLeft: 10,
  },
};
class ImportUnits extends React.Component {
  state = { openConfirmDialog: false };

  handleOpenConfirmDialog = () => this.setState({ openConfirmDialog: true });

  handleCloseConfirmDialog = () => this.setState({ openConfirmDialog: false });

  handleUploadClick = () => this.input && this.input.click();

  handleChange = async ({ target }) => {
    this.setState({ target });
    const { actions, importActions } = this.props;
    const importResult = await importActions.importUnits(target.files[0]);
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
    const importResult = await importActions.importUnits(target.files[0], true);
    if (importResult instanceof Error) {
      importActions.addMessage(new Message('FailImportingUnits', 'error'));
      return;
    }
    this.handleCloseConfirmDialog();
    importActions.addMessage(new Message('ImportUnitsSuccess', 'success'));
    actions.load();
    this.setState({ target: {} });
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

const mapDispatchToProps = (dispatch) => ({
  importActions: {
    importUnits: bindActionCreators(importUnits, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});

const translated = translate('UnitsListPage')(ImportUnits);
const styled = withStyles(styles)(translated);
export default connect(mapStateToProps, mapDispatchToProps)(styled);
