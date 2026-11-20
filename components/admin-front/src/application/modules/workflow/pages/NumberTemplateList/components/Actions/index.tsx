import React from 'react';
import DeleteTemplateRaw from './DeleteTemplate';
import EditTemplateRaw from './EditTemplate';
import ExportTemplateRaw from './ExportTemplate';

const DeleteTemplate = DeleteTemplateRaw as unknown as React.ComponentType<Record<string, unknown>>;
const EditTemplate = EditTemplateRaw as unknown as React.ComponentType<Record<string, unknown>>;
const ExportTemplate = ExportTemplateRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface NumberTemplate {
  id?: string | number;
  name?: string;
}

interface TemplateActionsProps {
  template?: NumberTemplate;
  actions?: Record<string, unknown>;
  readOnly?: boolean;
}

const TemplateActions = ({ template = {}, actions = {}, readOnly }: TemplateActionsProps) => {
  const menuItemProps = {
    actions,
    template,
    onChange: (actions as { load?: () => void }).load,
  };

  return (
    <div style={{ display: 'flex' }}>
      <EditTemplate {...menuItemProps} readOnly={readOnly} />
      <ExportTemplate {...menuItemProps} />
      {readOnly ? null : <DeleteTemplate {...menuItemProps} />}
    </div>
  );
};

export default TemplateActions;
