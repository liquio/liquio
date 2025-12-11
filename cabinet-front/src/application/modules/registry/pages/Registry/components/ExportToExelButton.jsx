import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import moment from 'moment';
import XLSX from 'xlsx';
import JSZip from 'jszip';
import objectPath from 'object-path';
import { Tooltip, IconButton, CircularProgress } from '@mui/material';
import {
  Template,
  TemplatePlaceholder,
  Plugin,
  TemplateConnector
} from '@devexpress/dx-react-core';
import SaveAltIcon from '@mui/icons-material/SaveAlt';

import evaluate from 'helpers/evaluate';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import { requestRegisterKeyRecords } from 'application/actions/registry';
import { getConfig } from '../../../../../../core/helpers/configLoader';

const s2ab = (s) => {
  const buf = new ArrayBuffer(s.length); // convert s to arrayBuffer
  const view = new Uint8Array(buf); // create uint8array as viewer
  for (let i = 0; i < s.length; i++) {
    view[i] = s.charCodeAt(i) & 0xff; // convert to octet
  }
  return buf;
};

const ExportToExelButton = ({
  t,
  columns: columnsOrigin,
  selectedKey,
  downloadIcon,
  className,
  actions,
  filters,
  count
}) => {
  const config = getConfig();

  const [busy, setBusy] = React.useState(false);

  if (selectedKey?.schema?.exportToExcel === false) return null;

  const sheetName = selectedKey.description || selectedKey.name || 'Sheet1';

  const columns = selectedKey.toExport
    ? selectedKey?.schema?.toExportColumns || columnsOrigin
    : columnsOrigin;

  const handleDownload = async () => {
    if (busy || !selectedKey) return;

    setBusy(true);

    const requestsFilters = {};

    if (filters) {
      Object.keys(filters).forEach((name) => {
        requestsFilters[`data[${name}]`] = filters[name];
      });
    }

    const limit = 5000;
    let offset = 0;
    let records = [];
    const maxIterations = 40;
    let iterations = 0;

    while (offset < count && iterations < maxIterations) {
      const batchRecords = await actions.requestRegisterKeyRecords(selectedKey.id, {
        strict: false,
        limit,
        offset,
        ...requestsFilters
      });

      if (batchRecords instanceof Error) {
        setBusy(false);
        return;
      }

      records = records.concat(batchRecords);
      offset += limit;
      iterations++;

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const chunkSize = 10000;

    const zip = new JSZip();

    const totalChunks = Math.ceil(records.length / chunkSize);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const chunk = records.slice(chunkIndex * chunkSize, (chunkIndex + 1) * chunkSize);

      const wb = XLSX.utils.book_new();

      wb.Props = {
        Title: `${sheetName} (part ${chunkIndex + 1})`,
        Subject: t('Registry'),
        Author: config.application.name,
        CreatedDate: new Date()
      };

      const sheetSafeName = `${sheetName}_part_${chunkIndex + 1}`
        .replace(/[:\\\/\?\*\[\]]/g, '_')
        .slice(0, 31);

      const header = columns.map(({ title }) => title);

      const data = chunk.map((recordOrigin) => {
        let record = recordOrigin;

        if (selectedKey?.toExport && selectedKey.toExport !== '(record) => { return null; }') {
          record = evaluate(selectedKey.toExport, record);
        }

        return columns.map((column) => {
          let text;

          if (column.name === 'data') {
            const content = evaluate(selectedKey.toString, record);
            text = content instanceof Error ? null : content ?? null;
          } else if (typeof selectedKey.schema.toTable === 'object') {
            text = evaluate(selectedKey.schema.toTable[column.title], record);
            if (text instanceof Error) {
              text = evaluate(selectedKey.schema.toTable[column.propertyName], record);
            }
          } else {
            text = objectPath.get(record, column.name);
          }

          if (column?.dateFormat) {
            text = moment(text).format(column?.dateFormat);
          }

          const columnType = selectedKey.schema?.properties[column?.propertyName]?.type;

          text = columnType === 'boolean' ? JSON.stringify(!!text) : text;

          if (Array.isArray(text)) {
            text = text.join(', ');
          } else if (typeof text === 'object') {
            let arrayTypeResult = '';
            [].concat(text).forEach((element) => {
              if (!element) return;
              const fields = Object.keys(element);
              fields.forEach((field) => {
                arrayTypeResult += ` ${field}: ${element[field]}\n`;
              });
              arrayTypeResult += '\n';
            });
            text = arrayTypeResult;
          }

          return text;
        });
      });

      const ws = XLSX.utils.aoa_to_sheet([header, ...data]);

      XLSX.utils.book_append_sheet(wb, ws, sheetSafeName);

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

      const blob = new Blob([s2ab(wbout)], {
        type: 'application/octet-stream'
      });

      const fileName = `${sheetName}_part_${chunkIndex + 1}.xlsx`;

      zip.file(fileName, blob, {
        base64: true
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const zipFile = await zip.generateAsync({ type: 'blob' });

    downloadBase64Attach({ fileName: `${sheetName}.zip` }, zipFile);

    setBusy(false);
  };

  return (
    <Plugin name="ExportToExelButton">
      <Template name="toolbarContent">
        <TemplatePlaceholder />
        <TemplateConnector>
          {() => (
            <Tooltip title={t('ExportToExel')}>
              <IconButton
                onClick={handleDownload}
                disabled={!selectedKey}
                className={className}
                size="large"
              >
                {busy ? <CircularProgress size={24} /> : downloadIcon || <SaveAltIcon />}
              </IconButton>
            </Tooltip>
          )}
        </TemplateConnector>
      </Template>
    </Plugin>
  );
};

ExportToExelButton.propTypes = {
  t: PropTypes.func.isRequired,
  selectedKey: PropTypes.object,
  actions: PropTypes.object.isRequired,
  columns: PropTypes.array.isRequired,
  className: PropTypes.object,
  downloadIcon: PropTypes.node,
  filters: PropTypes.object
};

ExportToExelButton.defaultProps = {
  selectedKey: null,
  className: null,
  downloadIcon: null,
  filters: null
};

const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestRegisterKeyRecords: bindActionCreators(requestRegisterKeyRecords, dispatch)
  }
});

const translated = translate('RegistryPage')(ExportToExelButton);
export default connect(null, mapDispatchToProps)(translated);
