import { connect } from 'react-redux';

const TableRow = ({ templates, item }) => {
  const template = (templates || []).find(({ id }) => id === item.workflowTemplateId);
  return item.name || (template ? template.name : 'Unnamed');
};

export default connect(({ workflowTemplate: { list } }) => ({
  templates: list
}))(TableRow);
