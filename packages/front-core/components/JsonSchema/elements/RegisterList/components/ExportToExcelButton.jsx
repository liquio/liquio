import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { useTranslate } from 'react-translate';
import { Button, CircularProgress } from '@mui/material';
import {
  requestRegisterKeys,
  requestRegisterKeyRecords,
} from 'application/actions/registry';
import XLSX from 'xlsx';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import evaluate from 'helpers/evaluate';
import JSZip from 'jszip';
import { getConfig } from 'helpers/configLoader';

const s2ab = (s) => {
  const buf = new ArrayBuffer(s.length); // convert s to arrayBuffer
  const view = new Uint8Array(buf); // create uint8array as viewer
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < s.length; i++) {
    // eslint-disable-next-line no-bitwise
    view[i] = s.charCodeAt(i) & 0xff; // convert to octet
  }
  return buf;
};

const ExportToExcelButton = ({
  loading,
  keys,
  actions,
  exportColumns,
  keyId,
  toExport,
  selectedFilters,
  count,
  classes
}) => {
  const config = getConfig();
  const t = useTranslate('Elements');
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      if (loading) return;

      if (!keys) {
        await actions.requestRegisterKeys();
      }
    };

    if (!exportColumns?.length) return;

    fetchData();
  }, [actions, loading, keys, exportColumns]);

  const keyIdSchema = React.useMemo(() => {
    return keys?.find((key) => key?.id === keyId);
  }, [keys, keyId]);

  const handleDownload = async () => {
    if (!exportColumns) return;
    if (loading || !keyId || exporting) return;

    setExporting(true);

    const name = keyIdSchema?.name || '';

    const limit = 5000;
    let offset = 0;
    let records = [];
    const maxIterations = 40;
    let iterations = 0;

    while (offset < count && iterations < maxIterations) {
      const batchRecords = await actions.requestRegisterKeyRecords(keyId, {
        ...selectedFilters,
        strict: false,
        limit,
        offset,
      });

      if (batchRecords instanceof Error) {
        setExporting(false);
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
      const chunk = records.slice(
        chunkIndex * chunkSize,
        (chunkIndex + 1) * chunkSize
      );

      const wb = XLSX.utils.book_new();

      wb.Props = {
        Title: `${name} (part ${chunkIndex + 1})`,
        Subject: t('Registry'),
        Author: config.application.name,
        CreatedDate: new Date(),
      };

      const sheetSafeName = `${name}_part_${chunkIndex + 1}`
        .replace(/[:\\\/\?\*\[\]]/g, '_')
        .slice(0, 31);

      const header = exportColumns?.map(
        (column) => keyIdSchema?.schema?.properties?.[column]?.description || ''
      );

      const data = chunk.map((recordOrigin) => {
        let record = recordOrigin;

        if (toExport && toExport !== '(record) => { return null; }') {
          record = {
            data: evaluate(toExport, record),
          };
        }

        return exportColumns.map((column) => {
          const columnData = keyIdSchema?.schema?.properties?.[column];

          let text = record?.data?.[column];

          const columnType = columnData?.type;

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

      const ws = XLSX.utils.aoa_to_sheet([header, ...data]);

      XLSX.utils.book_append_sheet(wb, ws, sheetSafeName);

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

      const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });

      const fileName = `${name}_part_${chunkIndex + 1}.xlsx`;

      zip.file(fileName, blob, { base64: true });

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const zipFile = await zip.generateAsync({ type: 'blob' });

    downloadBase64Attach({ fileName: `${name}.zip` }, zipFile);

    setExporting(false);
  };

  return (
    <Button
      size="large"
      color="primary"
      variant="contained"
      onClick={handleDownload}
      className={classes.export}
      startIcon={exporting ? <CircularProgress size={24} className={classes.LoadingButton} /> : null}
    >
      {t('Export')}
    </Button>
  );
};

const mapStateToProps = ({ registry: { keys } }) => ({
  keys,
});

const mapDispatch = (dispatch) => ({
  actions: {
    requestRegisterKeys: bindActionCreators(requestRegisterKeys, dispatch),
    requestRegisterKeyRecords: bindActionCreators(
      requestRegisterKeyRecords,
      dispatch,
    ),
  },
});

export default connect(mapStateToProps, mapDispatch)(ExportToExcelButton);
