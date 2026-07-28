import React from 'react';

import { Button, Divider } from '@mui/material';

const PARALLEL_GATEWAY_TYPE = 'bpmn:ParallelGateway';

const CreateParallelGatewayEnding = ({ t, modeler, selection, classes }) => {
  if (!modeler || !selection || selection.type !== PARALLEL_GATEWAY_TYPE) {
    return null;
  }

  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  const {
    parent,
    x,
    y,
    businessObject: { id },
  } = selection;

  if (id.indexOf('_') >= 0 || id.slice(id.length - 3) === 'end') {
    return null;
  }

  const endId = id + '-end';
  const existed = elementRegistry.get(endId);

  if (existed) {
    return null;
  }

  return (
    <>
      <Divider className={classes.divider} />
      <Button
        className={classes.copyElementButton}
        onClick={() => {
          try {
            const newElement = modeling.appendShape(
              selection,
              {
                id: endId,
                type: PARALLEL_GATEWAY_TYPE,
              },
              {
                x: x + 200,
                y: y + 25,
              },
              parent,
            );
            newElement.businessObject.id = endId;
            modeling.updateProperties(newElement, { id: endId });
          } catch (e) {
            // Nothing to do
          }
        }}
      >
        {t('CreateParallelGatewayEnding')}
      </Button>
    </>
  );
};

export default CreateParallelGatewayEnding;
