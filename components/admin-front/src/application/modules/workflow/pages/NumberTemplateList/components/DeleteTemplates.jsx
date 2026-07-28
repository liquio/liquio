import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { Tooltip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import asyncFilter from 'helpers/asyncFilter';
import ConfirmDialog from 'components/ConfirmDialog';

class DeleteTemplates extends React.Component {
  constructor(props) {
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

DeleteTemplates.propTypes = {
  t: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  rowsSelected: PropTypes.array.isRequired,
};

export default translate('NumberTemplateListPage')(DeleteTemplates);
