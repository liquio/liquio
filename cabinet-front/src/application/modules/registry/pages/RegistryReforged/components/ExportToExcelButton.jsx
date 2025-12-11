import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import { bindActionCreators } from 'redux';
import moment from 'moment';
import XLSX from 'xlsx';
import objectPath from 'object-path';
import { CircularProgress, Button } from '@mui/material';
import SaveAltIcon from '@mui/icons-material/SaveAlt';

import evaluate from 'helpers/evaluate';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import { requestRegisterKeyRecords } from 'application/actions/registry';
import { getConfig } from '../../../../../../core/helpers/configLoader';

const s2ab = (s) => {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < s.length; i++) {
    view[i] = s.charCodeAt(i) & 0xff;
  }
  return buf;
};
const specialKeys = ['update_to', 'updatedAt'];

const ExportToExcelButton = ({
  t,
  columns: columnsOrigin,
  selectedKey,
  downloadIcon,
  className,
  actions,
  filters,
  dataLikeFilters,
  count
}) => {
  const config = getConfig();

  const [busy, setBusy] = React.useState(false);

  if (selectedKey?.schema?.exportToExcel === false) return null;

  const sheetName = selectedKey.description || selectedKey.name;

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

    if (dataLikeFilters) {
      Object.entries(dataLikeFilters).forEach(([name, value]) => {
        if (specialKeys.includes(name)) {
          const updatedFrom = moment(value, ['DD.MM.YYYY', 'YYYY-MM-DD'], true).format(
            'YYYY-MM-DD'
          );
          const updatedTo = moment(updatedFrom).add(1, 'days').format('YYYY-MM-DD');
          requestsFilters.updated_from = updatedFrom;
          requestsFilters.updated_to = updatedTo;
        } else {
          requestsFilters[`data_like[${name}]`] = value;
        }
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

    const wb = XLSX.utils.book_new();

    wb.Props = {
      Title: sheetName,
      Subject: t('Registry'),
      Author: config?.application?.name || t('Registry'),
      CreatedDate: new Date()
    };

    wb.SheetNames.push(sheetName.slice(0, 31));

    const header = columns.map(({ headerName, title }) => headerName || title);

    const data = records.map((recordOrigin) => {
      let record = recordOrigin;

      if (selectedKey?.toExport && selectedKey.toExport !== '(record) => { return null; }') {
        record = evaluate(selectedKey.toExport, record);
      }

      return columns.map((column) => {
        let text;

        if (column.field === 'data') {
          const content = evaluate(selectedKey.toString, record);

          if (content instanceof Error) {
            text = null;
          }

          text = content ?? null;
        } else if (typeof selectedKey.schema.toTable === 'object') {
          text = evaluate(selectedKey.schema.toTable[column.title], record);

          if (text instanceof Error) {
            text = evaluate(selectedKey.schema.toTable[column.propertyName], record);
          }
        } else {
          text = objectPath.get(record, column.field || column.name);
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
              arrayTypeResult = `${arrayTypeResult} ${field}: ${element[field]} \n`;
            });
            arrayTypeResult = `${arrayTypeResult} \n`;
          });

          text = arrayTypeResult;
        }

        return text;
      });
    });

    wb.Sheets[sheetName.slice(0, 31)] = XLSX.utils.aoa_to_sheet([header, ...data]);

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

    const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });

    setBusy(false);

    downloadBase64Attach(
      {
        fileName: sheetName + '.xlsx'
      },
      blob
    );
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={!selectedKey}
      className={className}
      startIcon={busy ? <CircularProgress size={24} /> : downloadIcon || <SaveAltIcon />}
    >
      {t('ExportToExel')}
    </Button>
  );
};

ExportToExcelButton.propTypes = {
  t: PropTypes.func.isRequired,
  selectedKey: PropTypes.object,
  actions: PropTypes.object.isRequired,
  columns: PropTypes.array.isRequired,
  className: PropTypes.object,
  downloadIcon: PropTypes.node,
  filters: PropTypes.object
};

ExportToExcelButton.defaultProps = {
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

const translated = translate('RegistryPage')(ExportToExcelButton);

export default connect(null, mapDispatchToProps)(translated);
