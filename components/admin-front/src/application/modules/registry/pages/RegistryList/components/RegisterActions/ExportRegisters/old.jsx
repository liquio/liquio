import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import {
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import Preloader from 'components/Preloader';
import Message from 'components/Snackbars/Message';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import downloadBase64Attach from 'helpers/downloadBase64Attach';

const styles = {
  buttonPadding: {
    marginLeft: 10,
  },
  actionBtn: {
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    paddingBottom: 0,
  },
};

class ExportRegisters extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      showErrorDialog: false,
      loading: false,
      withoutData: false,
      useStream: false,
      withData: true,
    };
  }

  handleErrorDialog = () => this.setState({ showErrorDialog: true });

  exportRegister = async () => {
    const { actions, register } = this.props;
    const { withData } = this.state;

    this.setState({ open: false, loading: true });

    const blob = await actions.exportRegisters(register.id, withData);

    this.setState({ loading: false });

    if (blob instanceof Error) {
      blob.message === 'Max export limit reached.'
        ? this.handleErrorDialog()
        : actions.addMessage(new Message('FailExportingRegisters', 'error'));

      return null;
    }
    return downloadBase64Attach(
      { fileName: register.name + '_stream.bpmn' },
      blob,
    );
  };

  handleChange = (event) => {
    const value = event && event.target && event.target.value;
    const checked = event && event.target && event.target.checked;
    this.setState({
      withData: false,
      withoutData: false,
      [value]: checked,
    });
  };

  render = () => {
    const { t, onClose, classes } = this.props;
    const { open, showErrorDialog, withData, withoutData, loading } =
      this.state;

    return (
      <>
        {loading ? (
          <Dialog open={true}>
            <Preloader />
          </Dialog>
        ) : null}
        <MenuItem onClick={() => this.setState({ open: true }, onClose)}>
          <ListItemIcon>
            <SaveAltIcon />
          </ListItemIcon>
          <ListItemText primary={t('ExportRegister')} />
        </MenuItem>
        <Dialog onClose={() => this.setState({ open: false })} open={open}>
          <DialogTitle className={classes.title}>
            {t('HowToExport')}
          </DialogTitle>
          <DialogContent>
            <RadioGroup row={false}>
              <FormControlLabel
                control={
                  <Radio
                    id={'with-data-radio'}
                    value={'withData'}
                    checked={withData}
                    onChange={this.handleChange}
                  />
                }
                label={t('WithData')}
              />
              <FormControlLabel
                control={
                  <Radio
                    id={'without-data-radio'}
                    value={'withoutData'}
                    checked={withoutData}
                    onChange={this.handleChange}
                  />
                }
                label={t('WithoutData')}
              />
            </RadioGroup>
            <Button
              variant="contained"
              color="primary"
              onClick={this.exportRegister}
              className={classes.actionBtn}
            >
              {t('Continue')}
            </Button>
          </DialogContent>
        </Dialog>
        <Dialog
          open={showErrorDialog}
          onClose={() => this.setState({ showErrorDialog: false })}
        >
          <DialogTitle>{t('ErrorWhileExportingRegister')}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {t('RegisterExportErrorMessage')}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => this.setState({ showErrorDialog: false })}
              color="primary"
              autoFocus={true}
            >
              {t('CloseErrorDialog')}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  };
}

ExportRegisters.propTypes = {
  register: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  classes: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

ExportRegisters.defaultProps = {};

const styled = withStyles(styles)(ExportRegisters);
export default translate('RegistryListAdminPage')(styled);
