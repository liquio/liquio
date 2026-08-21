import {
  deleteNumberTemplate,
  createNumberTemplate,
  updateNumberTemplate,
  exportTemplates,
  importTemplates,
} from 'application/actions/numberTemplates';
import { addMessage } from 'actions/error';

export default {
  dataURL: 'number-templates',
  sourceName: 'numberTemplateList',
  actions: {
    deleteNumberTemplate,
    createNumberTemplate,
    updateNumberTemplate,
    exportTemplates,
    addMessage,
    importTemplates,
  },
};
