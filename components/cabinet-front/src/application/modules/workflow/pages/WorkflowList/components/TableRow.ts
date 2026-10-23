import { connect } from 'react-redux';

interface WorkflowTemplate {
  id: string | number;
  name?: string;
}

interface TableRowProps {
  templates: WorkflowTemplate[];
  item: { name?: string; workflowTemplateId?: string | number };
}

const TableRow = ({ templates, item }: TableRowProps) => {
  const template = (templates || []).find(({ id }) => id === item.workflowTemplateId);
  return item.name || (template ? template.name : 'Unnamed');
};

export default connect(({ workflowTemplate: { list } }: { workflowTemplate: { list: WorkflowTemplate[] } }) => ({
  templates: list
}))(TableRow as never);
