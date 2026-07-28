import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { Dialog } from '@mui/material';
import Preloader from 'components/Preloader';
import Message from 'components/Snackbars/Message';
import DownloadIcon from 'assets/img/dowload-icon.svg';
import parseFile from 'helpers/parseFile';

class ImportTemplate extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      openConfirmDialog: false,
      filesInfo: '',
    };
  }

  handleCloseExistsModal = () => {
    this.setState({
      existsModal: false,
    });
  };

  handleChange = async ({ target }) => {
    const { actions } = this.props;

    const file = target.files[0];

    parseFile(file, ({ id, name }) => {
      this.setState({
        loading: false,
        filesInfo: `${id} «${name}»`,
      });
    });

    this.setState({ loading: true });

    const importResult = await actions.importTemplates(file);

    this.input.value = null;

    this.setState({ loading: false });

    const { filesInfo } = this.state;

    if (importResult instanceof Error) {
      if (importResult.message.indexOf('already exists') !== -1) {
        actions.addMessage(
          new Message('NumberTemplateAlreadyExists', 'error', null, {
            filesInfo,
          }),
        );
      } else {
        actions.addMessage(new Message('InvalidFile', 'error'));
      }
      return;
    }

    actions.addMessage(
      new Message('NumberTemplateAlreadyExported', 'success', null, {
        filesInfo,
      }),
    );

    actions.load();
  };

  handleUploadClick = () => this.input && this.input.click();

  render = () => {
    const { t, ColorButton } = this.props;
    const { loading } = this.state;

    return (
      <>
        {loading ? (
          <Dialog open={true}>
            <Preloader />
          </Dialog>
        ) : null}
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

        <ColorButton
          variant="contained"
          color="primary"
          disableElevation={true}
          onClick={this.handleUploadClick}
          style={{ marginLeft: 16 }}
        >
          <img src={DownloadIcon} alt="import icon" />
          {t('ImportTemplates')}
        </ColorButton>
      </>
    );
  };
}

ImportTemplate.propTypes = {
  actions: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
};

ImportTemplate.defaultProps = {};

export default translate('NumberTemplateListPage')(ImportTemplate);
