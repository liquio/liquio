import React from 'react';
import { translate } from 'react-translate';
import { Tab, Tabs } from '@mui/material';

import FullScreenDialog from 'components/FullScreenDialog';
import ReportDesigner from 'components/StimulSoft/ReportDesigner';
import ReportViewer from 'components/StimulSoft/ReportViewer';

const EditReportDialog = ({ t, report, onChange, onClose, onInteraction }) => {
  const [activeTab, setActiveTab] = React.useState(0);

  const handleChange = React.useCallback(
    (newTemplate) => {
      if (!onChange) {
        return;
      }

      onChange({
        ...report,
        data: {
          ...report.data,
          template: newTemplate
        }
      });
    },
    [report, onChange]
  );

  return (
    <FullScreenDialog
      open={!!report}
      title={
        <Tabs value={activeTab} onChange={(e, newActiveTab) => setActiveTab(newActiveTab)}>
          <Tab label={t('EditReport', report.data)} />
          <Tab label={t('Preview')} />
        </Tabs>
      }
      onClose={onClose}
    >
      {activeTab === 0 ? (
        <ReportDesigner template={report.data.template} onChange={handleChange} />
      ) : null}
      {activeTab === 1 ? <ReportViewer report={report} onInteraction={onInteraction} /> : null}
    </FullScreenDialog>
  );
};

export default translate('ReportListPage')(EditReportDialog);
