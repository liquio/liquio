import React from 'react';
import RecordsTreeControl from './components/recordsTree';
import SeparatedRegister from './components/separatedRegisters';

interface AddressProps {
  recordsTree?: boolean | null;
  template?: Record<string, unknown>;
  stepName?: string;
  schema?: Record<string, unknown>;
  withNamedObjects?: boolean | null;
  allVisibleStreet?: boolean;
  hidden?: boolean;
  cleanWhenHidden?: boolean;
  rootDocument?: { data: Record<string, unknown> };
  actions?: Record<string, unknown>;
  path?: Array<string | number>;
  name: string;
  parentSchema?: { properties?: Record<string, { control?: string }> };
  indexHidden?: unknown;
  isPopup?: boolean;
}

const Address = (props: AddressProps) => {
  const {
    recordsTree = null,
    template = {},
    stepName = '',
    schema = {},
    withNamedObjects = null,
    allVisibleStreet = false,
    hidden = false,
    cleanWhenHidden = false,
    rootDocument = {},
    actions = {},
    path = [],
    name,
    parentSchema,
    indexHidden,
    isPopup,
  } = props;
  const hasMultipleAddressControls = (parentSchema?: { properties?: Record<string, { control?: string }> }) => {
    const controls = parentSchema?.properties
      ? Object.values(parentSchema.properties)
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
    return <RecordsTreeControl {...(props as unknown as Record<string, unknown>)} />;
  }

  return (
    <SeparatedRegister
      recordsTree={recordsTree as boolean}
      template={template as unknown as Record<string, unknown> & { jsonSchema: { properties: Record<string, { properties: Record<string, unknown> }>; calcTriggers?: Array<{ source: string; target: string; calculate: string }> } }}
      stepName={stepName as string}
      schema={schema as Record<string, unknown> & { inject?: Array<{ position: string; control: Record<string, unknown> }> | null }}
      withNamedObjects={withNamedObjects as boolean}
      allVisibleStreet={allVisibleStreet}
      hidden={hidden}
      cleanWhenHidden={cleanWhenHidden}
      rootDocument={rootDocument as { data: Record<string, unknown> }}
      actions={actions as { setValues: (data: unknown) => Promise<unknown> }}
      path={path as Array<string | number>}
      name={name}
      isPopup={isPopup}
      multiAddress={hasMultipleAddressControls(parentSchema)}
      indexHidden={indexHidden}
    />
  );
};

export default Address;
