import React from 'react';
import PropTypes from 'prop-types';
import DeleteTemplate from './DeleteTemplate';
import EditTemplate from './EditTemplate';
import ExportTemplate from './ExportTemplate';

const TemplateActions = ({ template, actions, readOnly }) => {
  const menuItemProps = {
    actions,
    template,
    onChange: actions.load,
  };

  return (
    <div style={{ display: 'flex' }}>
      <EditTemplate {...menuItemProps} readOnly={readOnly} />
      <ExportTemplate {...menuItemProps} />
      {readOnly ? null : <DeleteTemplate {...menuItemProps} />}
    </div>
  );
};

TemplateActions.propTypes = {
  template: PropTypes.object,
  actions: PropTypes.object,
};

TemplateActions.defaultProps = {
  template: {},
  actions: {},
};

export default TemplateActions;
