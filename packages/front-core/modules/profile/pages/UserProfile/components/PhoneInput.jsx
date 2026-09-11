import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { IconButton, InputAdornment } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import BorderColorRoundedIcon from '@mui/icons-material/BorderColorRounded';
import TextField from '@mui/material/TextField';

import PhoneEditModal from './PhoneEditModal';
import customInputStyle from './styles';
import { getConfig } from 'helpers/configLoader';

class PhoneInput extends React.Component {
  state = { showPhoneEditModal: false };

  closePhoneEditModal = () => this.setState({ showPhoneEditModal: false });

  showPhoneEditModal = () => this.setState({ showPhoneEditModal: true });

  render() {
    const config = getConfig();
    const { showPhoneEditModal } = this.state;
    const { t, value, onChange } = this.props;

    return (
      <Fragment>
        {config && config.showPhone ? (
          <>
            <TextField
              variant="standard"
              disabled={true}
              name="phone"
              label={t('PhoneInputLabel')}
              value={value || ''}
              margin="dense"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={this.showPhoneEditModal}>
                      <BorderColorRoundedIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </>
        ) : null}
        <PhoneEditModal
          open={showPhoneEditModal}
          onClose={this.closePhoneEditModal}
          onChange={onChange}
        />
      </Fragment>
    );
  }
}

PhoneInput.propTypes = {
  t: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
};

PhoneInput.defaultProps = {
  value: '',
};

const styled = withStyles(customInputStyle)(PhoneInput);
const translated = translate('UserProfile')(styled);

const mapStateToProps = () => ({});

const mapDispatchToProps = () => ({ actions: {} });

// decorate and export
export default connect(mapStateToProps, mapDispatchToProps)(translated);
