import React from 'react';
import { useDispatch } from 'react-redux';
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
// admin-front's own `application/actions/task` doesn't export this
// (cabinet-front-only); see ProtectedFile/index.tsx for the same pattern.
import * as taskActions from 'application/actions/task';
import processList from 'services/processList';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import base64ToBlob from 'helpers/base64ToBlob';
import flatten from 'helpers/flatten';
import evaluate from 'helpers/evaluate';
import theme from 'theme';
import { ReactComponent as DownloadIcon } from 'components/FileDataTable/assets/ic_download.svg';
import { ReactComponent as VisibilityIconAlt } from 'components/FileDataTable/assets/ic_visibility.svg';

const getExternalReaderData = (taskActions as unknown as Record<string, (...args: unknown[]) => unknown>).getExternalReaderData;

interface FileEntry {
  name: string;
  base64: string;
  type: string;
  attachments?: unknown;
  data?: { attachments?: unknown };
  [key: string]: unknown;
}

interface ExternalReaderRegisterFilePreviewProps {
  rootDocument: { data: Record<string, unknown> };
  service: string;
  method: string;
  serviceErrorMessage?: string | null;
  pendingMessage?: string | null;
  description?: string | null;
  sample?: string | null;
  required?: boolean;
  hidden?: boolean;
  error?: boolean;
  filters?: Record<string, unknown>;
  path?: Array<string | number>;
  notRequiredLabel?: string;
  typography?: string;
  noMargin?: boolean;
  maxWidth?: number | string;
  margin?: number | string;
}

const ExternalReaderRegisterFilePreview = ({
  rootDocument,
  service,
  method,
  serviceErrorMessage = null,
  pendingMessage = null,
  description = null,
  sample = null,
  required = false,
  hidden = false,
  error = false,
  filters = {},
  path,
  notRequiredLabel,
  typography,
  noMargin,
  maxWidth,
  margin
}: ExternalReaderRegisterFilePreviewProps) => {
  const [files, setFiles] = React.useState<FileEntry[] | Error | null>(null);
  const [pending, setPendingMessage] = React.useState<string | null>(null);
  const [showPreview, setShowPreview] = React.useState<string | false>(false);
  const [extension, setExtension] = React.useState<string | false | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const dispatch = useDispatch();
  const t = useTranslate('WorkflowPage');

  const fetchData = React.useCallback(async () => {
    const eventName = 'init-ExternalReaderFilePreview' + (path ? path?.join('-') : '');

    const result = await processList.hasOrSet(eventName, async () => {
      const getFilters = () => {
        const mapFilters: Record<string, unknown> = {};

        Object.keys(filters).forEach((name) => {
          const filterValuePath = filters[name];

          let filterValue: unknown = evaluate(filterValuePath as string, rootDocument.data);
          if (typeof filterValuePath === 'boolean') {
            mapFilters[name] = filterValuePath;
            return;
          }

          if (filterValue instanceof Error) {
            filterValue = objectPath.get(rootDocument.data, filterValuePath as string);
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

      const data = (await dispatch(getExternalReaderData(body) as never)) as FileEntry[] | Error;

      setPendingMessage(null);

      if (data instanceof Error) {
        return data;
      }

      const mappedData = data.every((el) => el.attachments) ? data?.map(({ data }) => data?.attachments) : data;

      return flatten(mappedData as unknown[]);
    });

    setFiles(result as FileEntry[] | Error);
  }, [dispatch, service, method, pendingMessage, filters, rootDocument, path]);

  React.useEffect(() => {
    if (files || hidden) return;
    fetchData();
  }, [fetchData, files, hidden]);

  const handleDownload = React.useCallback(async (fileName: string, base64: string) => {
    downloadBase64Attach({ fileName }, base64ToBlob(base64));
  }, []);

  const showPreviewDialog = React.useCallback(
    async (fileName: string, base64: string, type: string) => {
      setShowPreview(`data:${type};base64,${base64}`);
      setFileName(fileName);
      setExtension(mime.extension(type));
    },
    [],
  );

  const responseError = React.useMemo(() => {
    return files instanceof Error ? serviceErrorMessage || files.message : null;
  }, [files, serviceErrorMessage]);

  const getRowId = React.useCallback((row: FileEntry) => row.name || row.base64, []);

  const columns = React.useMemo(() => {
    return [
      {
        field: 'name',
        headerName: t('Name'),
        minWidth: 400,
        sortable: false,
        renderCell: ({ value }: { value: unknown }) => value,
      },
      {
        field: 'actions',
        headerName: t('Actions'),
        type: 'actions',
        sortable: false,
        headerAlign: 'left',
        align: 'left',
        getActions: ({ row: { name, base64, type } }: { row: FileEntry }) => [
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
            {((files as FileEntry[]) || []).map(({ name, base64, type }, index) => (
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

    if (!(theme as unknown as { fileDataTableTypePremium?: boolean })?.fileDataTableTypePremium) {
      return DefaultTableComponent;
    }

    return (
      <DataGrid
        {...({
          rows: files,
          columns,
          controls: {
            export: false,
            search: false,
            refresh: false,
          },
          loading: pending,
          pagination: false,
          getRowId,
          height: '100%',
        } as unknown as Record<string, unknown>)}
      />
    );
  }, [files, responseError, pending, getRowId, columns, DefaultTableComponent]);

  if (hidden) return null;

  return (
    <ElementContainer
      description={description as string}
      notRequiredLabel={notRequiredLabel}
      sample={sample as string}
      required={required}
      error={error}
      bottomSample={true}
      variant={typography as never}
      noMargin={noMargin}
      maxWidth={maxWidth as number}
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

export default ExternalReaderRegisterFilePreview;
