import objectPath from 'object-path';
import findPathDeep from 'deepdash/findPathDeep';
import flatten from 'helpers/flatten';
import { getApiUrl } from 'services/api';
import storage from 'helpers/storage';
import diff from 'deep-diff';

const attachesToArray = (array, name) =>
  flatten(
    []
      .concat(array)
      .filter(Boolean)
      .map((data) => data[name])
      .filter(Boolean),
  );

const deleteDocumentAttaches = ({
  taskSchema,
  documentData,
  documentDataModified,
  targetPath,
}) => {
  try {
    const controlPath = `properties.${targetPath
      .split('.')
      .join('.properties.')}`;

    const controlSchema = objectPath.get(taskSchema?.jsonSchema, controlPath);

    const selectFilesPath = findPathDeep(
      controlSchema,
      (value) => value === 'select.files',
    );

    if (!selectFilesPath) return;

    const filesControlPath = `${controlPath}.${selectFilesPath}`.replace(
      '.control',
      '',
    );

    const filesControlDataPath = filesControlPath
      .replace(/properties./g, '')
      .replace(/items./g, '')
      .split('.');

    const fieldName = filesControlDataPath.pop();

    const controlDataOrigin = objectPath.get(
      documentData,
      filesControlDataPath,
    );
    const controlDataActual = objectPath.get(
      documentDataModified,
      filesControlDataPath,
    );

    const attachesOrigin = attachesToArray(controlDataOrigin, fieldName);
    const attachesActual = attachesToArray(controlDataActual, fieldName);

    if (!diff(attachesOrigin, attachesActual)) return;

    attachesOrigin.forEach((file) => {
      if (attachesActual.find(({ id }) => file.id === id)) return;

      if (!file) return;

      const { documentId, id } = file;

      fetch(`${getApiUrl()}documents/${documentId}/attachments/${id}`, {
        method: 'delete',
        cache: 'reload',
        headers: {
          'Content-Type': 'application/json',
          token: storage.getItem('token'),
        },
      });
    });
  } catch (e) {
    console.log('loop attaches error', e);
  }
};

export default deleteDocumentAttaches;
