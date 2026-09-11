import React from 'react';
import { translate } from 'react-translate';
import Handlebars from 'handlebars';
import useRS from 'radioactive-state';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Tooltip,
  Typography,
} from '@mui/material';

import queue from 'queue';
import { print } from 'html-to-printer';
import dotToPath from 'helpers/dotToPath';
import { formatUserName } from 'helpers/userName';
import withAuthorization from 'hooks/withAuthorization';

import htmlTemplatePath from 'application/modules/users/pages/UserProcessesList/variables/report_template.htm';
import moment from 'moment';

const DATETIME_FORMAT = 'DD.MM.YYYY HH:mm:ss';

const processQueue = queue({ autostart: true, concurrency: 1 });

const initialState = {
  loading: false,
  canceled: false,
  rendering: false,
  openEmptyFiltersDialog: false,
  total: 0,
  process: 0,
  results: [],
};

const ExportReport = ({
  t,
  actions,
  filters,
  count,
  columns,
  hiddenColumns,
  userInfo,
}) => {
  const state = useRS(initialState);

  React.useEffect(() => {
    processQueue.on('end', async () => {
      if (state.canceled) {
        state.loading = false;
      } else {
        state.rendering = true;

        const htmlTemplateRequest = await fetch(htmlTemplatePath);
        const htmlTemplate = await htmlTemplateRequest.text();

        const result = Handlebars.compile(htmlTemplate)({
          logs: state.results.map(({ createdAt, ...log }) => ({
            ...log,
            createdAt: moment(createdAt).format(DATETIME_FORMAT),
            ip: log.ip.filter((ip) => ip !== '127.0.0.1').join('; '),
          })),
          filters: dotToPath(filters),
          count,
          now: moment().format(DATETIME_FORMAT),
          showColumns: columns.reduce((acc, { id: columnId }) => {
            if (hiddenColumns.includes(columnId)) {
              return acc;
            }
            return { ...acc, [columnId]: true };
          }, {}),
          exporter: formatUserName(userInfo.name),
        });

        const tds = document.getElementsByTagName('td');
        const borders = [];

        for (let i = 0; i < tds.length; i++) {
          borders[i] = tds[i].style.borderBottom;
          tds[i].style.borderBottom = 'none';
        }

        print(result);

        for (let i = 0; i < tds.length; i++) {
          tds[i].style.borderBottom = borders[i];
        }

        state.rendering = false;
        state.loading = false;

        // const win = window.open();
        // win.document.body.innerHTML = result;
        // win.document.close();

        // win.focus();
        // win.print();
        // // win.document.body.innerHTML = '';
        // // win.close();
      }
    });

    processQueue.on('success', (result) => {
      state.process = state.total - processQueue.jobs.length + 1;
      state.results = [].concat(state.results, result);
    });

    return () => {
      processQueue.removeAllListeners('end');
      processQueue.removeAllListeners('success');
    };
  });

  const exportReport = async () => {
    if (state.loading) {
      return;
    }

    if (!Object.keys(filters).length) {
      state.openEmptyFiltersDialog = true;
      return;
    }

    state.results = [];
    state.process = 0;
    state.rendering = false;
    state.canceled = false;
    state.loading = true;

    const requests = actions.loadAllDataRequests({ rowsPerPage: 100 });
    state.total = requests.length;
    requests.forEach((request) => processQueue.push(request));
  };

  const stopExporting = () => {
    state.canceled = true;
    processQueue.end();
  };

  return (
    <>
      <Tooltip title={t('ExportReportToPdf')}>
        <div>
          <IconButton
            onClick={exportReport}
            disabled={state.loading || !count}
            size="large"
          >
            <PictureAsPdfIcon />
          </IconButton>
        </div>
      </Tooltip>

      <Dialog
        open={state.openEmptyFiltersDialog}
        onClose={() => {
          state.openEmptyFiltersDialog = false;
        }}
      >
        <DialogTitle>{t('EmptyFiltersTitle')}</DialogTitle>
        <DialogContent>
          <Typography>{t('EmptyFilters')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              state.openEmptyFiltersDialog = false;
            }}
          >
            {t('Ok')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={state.loading} fullWidth={true} maxWidth="sm">
        <DialogTitle>{t('Loading')}</DialogTitle>
        <DialogContent>
          <LinearProgress
            variant={state.rendering ? 'indeterminate' : 'determinate'}
            value={(100 * state.process) / state.total}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={stopExporting} disabled={state.rendering}>
            {t('Cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const authorized = withAuthorization(ExportReport);
export default translate('UserProcessesListPage')(authorized);
