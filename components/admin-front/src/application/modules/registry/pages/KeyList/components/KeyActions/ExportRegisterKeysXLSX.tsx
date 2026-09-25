import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { MenuItem, ListItemIcon, ListItemText, Dialog } from '@mui/material';
import Preloader from 'components/Preloader';
import Message from 'components/Snackbars/Message';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import { exportRegistersKeys } from 'application/actions/registry';
import { addMessage } from 'actions/error';
import ExplicitIcon from '@mui/icons-material/Explicit';

interface RegisterKeyItem {
  id: string;
  name?: string;
}

interface ExportRegisterKeysXLSXProps {
  registerId: string;
  registerKey: RegisterKeyItem;
  importActions: {
    exportRegistersKeys: (registerId: string, keyId: string) => Promise<Blob | Error>;
    addMessage: (message: unknown) => void;
  };
  t: (key: string, params?: Record<string, unknown>) => string;
  onClose: () => void;
}

interface ExportRegisterKeysXLSXState {
  loading: boolean;
}

class ExportRegisterKeys extends React.Component<ExportRegisterKeysXLSXProps, ExportRegisterKeysXLSXState> {
  constructor(props: ExportRegisterKeysXLSXProps) {
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

const mapDispatchToProps = (dispatch: Dispatch) => ({
  importActions: {
    exportRegistersKeys: bindActionCreators(exportRegistersKeys, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});
const translated = translate('RegistryListAdminPage')(ExportRegisterKeys as never);
export default connect(null, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
