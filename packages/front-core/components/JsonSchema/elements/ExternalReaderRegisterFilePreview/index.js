import React from 'react';
import { useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import objectPath from 'object-path';
import mime from 'mime-types';
import { useTranslate } from 'react-translate';
import {
  Tooltip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { SchemaForm } from 'components/JsonSchema';
import FileViewerDialog from 'components/FileViewerDialog';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import DataGrid from 'components/DataGridPremium';
import { GridActionsCellItem } from '@mui/x-data-grid';
import { getExternalReaderData } from 'application/actions/task';
import processList from 'services/processList';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import base64ToBlob from 'helpers/base64ToBlob';
import flatten from 'helpers/flatten';
import evaluate from 'helpers/evaluate';
import theme from 'theme';
import { ReactComponent as DownloadIcon } from 'components/FileDataTable/assets/ic_download.svg';
import { ReactComponent as VisibilityIconAlt } from 'components/FileDataTable/assets/ic_visibility.svg';

const ExternalReaderRegisterFilePreview = ({
  rootDocument,
  service,
  method,
  serviceErrorMessage,
  pendingMessage,
  description,
  sample,
  required,
  hidden,
  error,
  filters,
  path,
  notRequiredLabel,
  typography,
  noMargin,
  maxWidth,
  margin
}) => {
  const [files, setFiles] = React.useState(null);
  const [pending, setPendingMessage] = React.useState(null);
  const [showPreview, setShowPreview] = React.useState(false);
  const [extension, setExtension] = React.useState(null);
  const [fileName, setFileName] = React.useState(null);
  const dispatch = useDispatch();
  const t = useTranslate('WorkflowPage');

  const fetchData = React.useCallback(async () => {
    const eventName = 'init-ExternalReaderFilePreview' + (path ? path?.join('-') : '');

    const result = await processList.hasOrSet(eventName, async () => {
      const getFilters = () => {
        const mapFilters = {};

        Object.keys(filters).forEach((name) => {
          const filterValuePath = filters[name];

          let filterValue = evaluate(filterValuePath, rootDocument.data);
          if (typeof filterValuePath === 'boolean') {
            mapFilters[name] = filterValuePath;
            return;
          }

          if (filterValue instanceof Error) {
            filterValue = objectPath.get(rootDocument.data, filterValuePath);
          }

          if (!filterValue) {
            mapFilters[name] = filterValuePath;
            return;
          }

          mapFilters[name] = filterValue;
        });

        return mapFilters;
      };

      const body = {
        service,
        method,
        filters: getFilters(),
      };

      setPendingMessage(pendingMessage);

      const data = await dispatch(getExternalReaderData(body));

      setPendingMessage(null);

      if (data instanceof Error) {
        return data;
      }

      const mappedData = data.every(el => el.attachments) ? data?.map(({ data }) => data?.attachments) : data;

      return flatten(mappedData);
    });

    setFiles(result);
  }, [dispatch, service, method, pendingMessage, filters, rootDocument, path]);

  React.useEffect(() => {
    if (files || hidden) return;
    fetchData();
  }, [fetchData, files, hidden]);

  const handleDownload = React.useCallback(async (fileName, base64) => {
    downloadBase64Attach({ fileName }, base64ToBlob(base64));
  }, []);

  const showPreviewDialog = React.useCallback(
    async (fileName, base64, type) => {
      setShowPreview(`data:${type};base64,${base64}`);
      setFileName(fileName);
      setExtension(mime.extension(type));
    },
    [],
  );

  const responseError = React.useMemo(() => {
    return files instanceof Error ? serviceErrorMessage || files.message : null;
  }, [files, serviceErrorMessage]);

  const getRowId = React.useCallback((row) => row.name || row.base64, []);

  const columns = React.useMemo(() => {
    return [
      {
        field: 'name',
        headerName: t('Name'),
        minWidth: 400,
        sortable: false,
        renderCell: ({ value }) => value,
      },
      {
        field: 'actions',
        headerName: t('Actions'),
        type: 'actions',
        sortable: false,
        headerAlign: 'left',
        align: 'left',
        getActions: ({ row: { name, base64, type } }) => [
          <GridActionsCellItem
            key={name}
            icon={<DownloadIcon />}
            label={t('DownloadFile')}
            aria-label={t('DownloadFile')}
            onClick={() => handleDownload(name, base64)}
          />,
          <GridActionsCellItem
            key={name}
            icon={<VisibilityIconAlt />}
            label={t('ShowPreview')}
            aria-label={t('ShowPreview')}
            onClick={() => showPreviewDialog(name, base64, type)}
          />,
        ],
      },
    ];
  }, [t, handleDownload, showPreviewDialog]);

  const DefaultTableComponent = React.useMemo(() => {
    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align={'left'} padding={'none'}>
                {t('Name')}
              </TableCell>
              <TableCell align={'left'} padding={'normal'}>
                {t('Actions')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(files || []).map(({ name, base64, type }, index) => (
              <TableRow key={index}>
                <TableCell align={'left'} padding={'none'}>
                  {name}
                </TableCell>
                <TableCell align={'left'} padding={'none'} sx={{ width: 100 }}>
                  <Tooltip title={t('ShowPreview')}>
                    <IconButton
                      onClick={() => showPreviewDialog(name, base64, type)}
                      aria-label={t('ShowPreview')}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('DownloadFile')}>
                    <IconButton
                      onClick={() => handleDownload(name, base64)}
                      aria-label={t('DownloadFile')}
                    >
                      <SaveAltIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }, [files, t, handleDownload, showPreviewDialog]);

  const TableComponent = React.useMemo(() => {
    if (!files || responseError) return null;

    if (!theme?.fileDataTableTypePremium) {
      return DefaultTableComponent;
    }

    return (
      <DataGrid
        rows={files}
        columns={columns}
        controls={{
          export: false,
          search: false,
          refresh: false,
        }}
        loading={pending}
        pagination={false}
        getRowId={getRowId}
        height={'100%'}
      />
    );
  }, [files, responseError, pending, getRowId, columns, DefaultTableComponent]);

  if (hidden) return null;

  return (
    <ElementContainer
      description={description}
      notRequiredLabel={notRequiredLabel}
      sample={sample}
      required={required}
      error={error}
      bottomSample={true}
      variant={typography}
      noMargin={noMargin}
      maxWidth={maxWidth}
      margin={margin}
    >
      {TableComponent}

      <FileViewerDialog
        file={showPreview}
        fileName={fileName}
        open={!!showPreview}
        extension={extension}
        onClose={() => setShowPreview(false)}
      />

      <SchemaForm
        path={[]}
        schema={{
          type: 'object',
          properties: {
            style: {
              control: 'text.block',
              noMargin: true,
              htmlBlock:
                '<style>.fop-blocked-descr {margin-top: 20px;font-size: 20px;line-height: 24px;margin-bottom: 26px;}.info-block {display: inline-flex;background: #FFF4D7;padding: 30px 52px 34px 18px;margin-bottom: 50px;vertical-align: top;margin-top: 0;line-height: 24px;}.info-block-icon {font-size: 38px; margin-bottom: 15px;font-size: 38px;padding: 0px 17px 0px 0px;margin: 0px;margin-bottom: 10px;}.info-block p {margin: 0;}</style>',
            },
          },
        }}
      />

      {pending ? (
        <SchemaForm
          path={[]}
          schema={{
            type: 'object',
            properties: {
              pending: {
                control: 'text.block',
                htmlBlock: `<p class='info-block'>${pending}</p>`,
              },
            },
          }}
        />
      ) : null}

      {responseError ? (
        <SchemaForm
          path={[]}
          schema={{
            type: 'object',
            properties: {
              warning: {
                control: 'text.block',
                htmlBlock: `
                  <div class='fop-blocked-descr'>
                    <p class="info-block-icon">🤷🏻‍♂</p>
                    <p>${responseError}</p>
                  </div>
                `,
              },
            },
          }}
        />
      ) : null}
    </ElementContainer>
  );
};

ExternalReaderRegisterFilePreview.propTypes = {
  rootDocument: PropTypes.object.isRequired,
  service: PropTypes.string.isRequired,
  method: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  actions: PropTypes.object.isRequired,
  serviceErrorMessage: PropTypes.string,
  pendingMessage: PropTypes.string,
  description: PropTypes.string,
  sample: PropTypes.string,
  required: PropTypes.bool,
  hidden: PropTypes.bool,
  error: PropTypes.bool,
  filters: PropTypes.object,
};

ExternalReaderRegisterFilePreview.defaultProps = {
  serviceErrorMessage: null,
  pendingMessage: null,
  description: null,
  sample: null,
  required: false,
  hidden: false,
  error: false,
  filters: {},
};

export default ExternalReaderRegisterFilePreview;
