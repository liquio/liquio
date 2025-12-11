/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import RecordsTreeControl from './components/recordsTree';
import SeparatedRegister from './components/separatedRegisters';

const Address = (props) => {
  const {
    recordsTree,
    template,
    stepName,
    schema,
    withNamedObjects,
    allVisibleStreet,
    hidden,
    cleanWhenHidden,
    rootDocument,
    actions,
    path,
    name,
    parentSchema,
    indexHidden,
    isPopup,
  } = props;
  const hasMultipleAddressControls = (parentSchema) => {
    const controls = parentSchema?.properties
      ? Object.values(parentSchema?.properties)
      : [];
    const addressControlsCount = controls.reduce((count, control) => {
      if (control.control === 'address') {
        return count + 1;
      }
      return count;
    }, 0);

    return addressControlsCount > 1;
  };

  if (recordsTree === null) {
    return <RecordsTreeControl {...props} />;
  }

  return (
    <SeparatedRegister
      recordsTree={recordsTree}
      template={template}
      stepName={stepName}
      schema={schema}
      withNamedObjects={withNamedObjects}
      allVisibleStreet={allVisibleStreet}
      hidden={hidden}
      cleanWhenHidden={cleanWhenHidden}
      rootDocument={rootDocument}
      actions={actions}
      path={path}
      name={name}
      isPopup={isPopup}
      multiAddress={hasMultipleAddressControls(parentSchema)}
      indexHidden={indexHidden}
    />
  );
};

Address.propTypes = {
  recordsTree: PropTypes.bool,
  template: PropTypes.object,
  stepName: PropTypes.string,
  schema: PropTypes.object,
  withNamedObjects: PropTypes.bool,
  allVisibleStreet: PropTypes.bool,
  hidden: PropTypes.bool,
  cleanWhenHidden: PropTypes.bool,
  rootDocument: PropTypes.object,
  actions: PropTypes.object,
  path: PropTypes.array,
};

Address.defaultProps = {
  template: {},
  stepName: '',
  schema: {},
  withNamedObjects: null,
  allVisibleStreet: false,
  recordsTree: null,
  hidden: false,
  cleanWhenHidden: false,
  rootDocument: {},
  actions: {},
  path: [],
};

export default Address;
