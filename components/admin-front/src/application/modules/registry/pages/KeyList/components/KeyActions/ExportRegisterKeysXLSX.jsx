import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { MenuItem, ListItemIcon, ListItemText, Dialog } from '@mui/material';
import Preloader from 'components/Preloader';
import Message from 'components/Snackbars/Message';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import { exportRegistersKeys } from 'application/actions/registry';
import { addMessage } from 'actions/error';
import ExplicitIcon from '@mui/icons-material/Explicit';

class ExportRegisterKeys extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
    };
  }

  exportRegisterKey = async () => {
    const { importActions, registerId, registerKey, onClose } = this.props;

    this.setState({ loading: true });

    const blob = await importActions.exportRegistersKeys(
      registerId,
      registerKey.id,
    );

    this.setState({ loading: false });

    onClose();

    if (blob instanceof Error) {
      importActions.addMessage(new Message('FailExportingRegisters', 'error'));
      return null;
    }

    return downloadBase64Attach({ fileName: registerKey.name + '.xlsx' }, blob);
  };

  render = () => {
    const { t } = this.props;
    const { loading } = this.state;

    return (
      <>
        {loading ? (
          <Dialog open={true}>
            <Preloader />
          </Dialog>
        ) : null}
        <MenuItem onClick={this.exportRegisterKey}>
          <ListItemIcon>
            <ExplicitIcon />
          </ListItemIcon>
          <ListItemText primary={t('ExportRegisterXlsx')} />
        </MenuItem>
      </>
    );
  };
}

ExportRegisterKeys.propTypes = {
  registerId: PropTypes.string.isRequired,
  registerKey: PropTypes.object.isRequired,
  importActions: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

ExportRegisterKeys.defaultProps = {};

const mapDispatchToProps = (dispatch) => ({
  importActions: {
    exportRegistersKeys: bindActionCreators(exportRegistersKeys, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});
const translated = translate('RegistryListAdminPage')(ExportRegisterKeys);
export default connect(null, mapDispatchToProps)(translated);
