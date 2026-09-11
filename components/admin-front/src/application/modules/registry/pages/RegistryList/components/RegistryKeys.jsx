import React from 'react';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { getRegistersKeys } from 'application/actions/registry';
import { addMessage } from 'actions/error';

import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';

import Message from 'components/Snackbars/Message';

class RegistryKeys extends React.Component {
  componentDidUpdate(prevProps) {
    const { selectedKey } = this.props;

    if (prevProps.selectedKey !== selectedKey && selectedKey) {
      this.getRegistryKeys();
    }
  }

  getRegistryKeys = async () => {
    const { actions, selectedKey } = this.props;
    const registerId = selectedKey && selectedKey.id;
    const keys = await actions.getRegistersKeys(registerId);
    if (keys instanceof Error) {
      actions.addMessage(new Message('FailGettingRegistersKeys', 'error'));
    }
  };

  render() {
    const { t, registry, selectedKey, onClose } = this.props;
    return (
      <>
        <Dialog onClose={onClose} open={selectedKey}>
          <DialogTitle>{t('RegistryKeys')}</DialogTitle>
          <DialogContent>
            {selectedKey &&
            registry[selectedKey.id] &&
            registry[selectedKey.id].length ? (
              <Typography variant="body1">
                {registry[selectedKey.id].map((key, index) => (
                  <pre key={index}>{JSON.stringify(key, null, 4)}</pre>
                ))}
              </Typography>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} color="primary" autoFocus={true}>
              {t('CloseKeysDialog')}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
}

RegistryKeys.propTypes = {
  actions: PropTypes.object.isRequired,
};

RegistryKeys.defaultProps = {};

const mapStateToProps = ({ registry }) => ({
  registry,
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    getRegistersKeys: bindActionCreators(getRegistersKeys, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});
const translated = translate('RegistryListAdminPage')(RegistryKeys);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
