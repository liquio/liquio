import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Button } from '@mui/material';
import {
  Template,
  TemplatePlaceholder,
  Plugin,
  TemplateConnector
} from '@devexpress/dx-react-core';

import { requestRegisterKeyRecords } from 'application/actions/registry';

const ExportToExelButton = ({ t, onClick, disabled, className }) => (
  <Plugin name="ExportToExelButton">
    <Template name="toolbarContent">
      <TemplatePlaceholder />
      <TemplateConnector>
        {() => (
          <Button
            variant="contained"
            color="primary"
            disabled={disabled}
            onClick={onClick}
            className={className}
            aria-label={t('AddNewRow')}
          >
            {t('AddNewRow')}
          </Button>
        )}
      </TemplateConnector>
    </Template>
  </Plugin>
);

ExportToExelButton.propTypes = {
  t: PropTypes.func.isRequired,
  selectedKey: PropTypes.object,
  actions: PropTypes.object.isRequired,
  className: PropTypes.object
};

ExportToExelButton.defaultProps = {
  selectedKey: null,
  className: null
};

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestRegisterKeyRecords: bindActionCreators(requestRegisterKeyRecords, dispatch)
  }
});

const translated = translate('RegistryPage')(ExportToExelButton);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
