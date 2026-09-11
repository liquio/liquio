import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { IconButton, Tooltip, Dialog } from '@mui/material';
import Preloader from 'components/Preloader';
import Message from 'components/Snackbars/Message';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import downloadBase64Attach from 'helpers/downloadBase64Attach';

class ExportTemplate extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
    };
  }

  exportTemplate = async () => {
    const { actions, template } = this.props;

    this.setState({ loading: true });

    const blob = await actions.exportTemplates(template.id);

    this.setState({ loading: false });

    if (blob instanceof Error) {
      blob.message === 'Max export limit reached.'
        ? this.handleErrorDialog()
        : actions.addMessage(new Message('FailExportingTemplates', 'error'));

      return null;
    }

    return downloadBase64Attach(
      {
        fileName: `template-${template.name}-${template.id}.bpmn`,
      },
      blob,
    );
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
        <Tooltip title={t('ExportRegister')}>
          <IconButton onClick={this.exportTemplate} size="large">
            <SaveAltIcon />
          </IconButton>
        </Tooltip>
      </>
    );
  };
}

ExportTemplate.propTypes = {
  template: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
};

ExportTemplate.defaultProps = {};

export default translate('RegistryListAdminPage')(ExportTemplate);
