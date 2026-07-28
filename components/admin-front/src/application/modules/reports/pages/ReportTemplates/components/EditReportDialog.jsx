import React from 'react';
import { useTranslate } from 'react-translate';

import FullScreenDialog from 'components/FullScreenDialog';
import { Tab, Tabs } from '@mui/material';

import { makeStyles } from '@mui/styles';

import Preloader from 'components/Preloader';
import ReportDesigner from 'components/StimulSoft/ReportDesigner';
import ReportViewer from 'components/StimulSoft/ReportViewer';

import * as api from 'services/api';
import { useDispatch } from 'react-redux';

const useStyles = makeStyles(() => ({
  wrapper: {
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}));

const EditReportDialog = ({ report, onChange, onClose, onInteraction }) => {
  const t = useTranslate('ReportListPage');
  const classes = useStyles();
  const dispatch = useDispatch();
  const [reportData, setReportData] = React.useState();
  const [activeTab, setActiveTab] = React.useState(0);

  React.useEffect(() => {
    const loadReport = async () => {
      setReportData(
        await api.get(`bi/reports/${report.id}`, 'REQUEST_REPORT', dispatch),
      );
    };

    loadReport();
  }, [dispatch, report.id]);

  const handleChange = React.useCallback(
    (newTemplate) => {
      setReportData({
        ...reportData,
        data: {
          ...reportData.data,
          template: newTemplate,
        },
      });

      if (!onChange) {
        return;
      }

      onChange({
        ...reportData,
        data: {
          ...reportData.data,
          template: newTemplate,
        },
      });
    },
    [reportData, onChange],
  );

  return (
    <FullScreenDialog
      open={!!report}
      disableEscapeKeyDown={true}
      title={
        <Tabs
          value={activeTab}
          onChange={(e, newActiveTab) => setActiveTab(newActiveTab)}
        >
          <Tab
            classes={{ wrapper: classes.wrapper }}
            label={t('EditReport', report.data)}
          />
          <Tab label={t('Preview')} />
        </Tabs>
      }
      onClose={onClose}
    >
      {reportData ? (
        <>
          {activeTab === 0 ? (
            <ReportDesigner
              template={reportData.data.template}
              onChange={handleChange}
            />
          ) : null}
          {activeTab === 1 ? (
            <ReportViewer report={reportData} onInteraction={onInteraction} />
          ) : null}
        </>
      ) : (
        <div style={{ height: '100%', display: 'flex' }}>
          <Preloader flex={true} />
        </div>
      )}
    </FullScreenDialog>
  );
};

export default EditReportDialog;
