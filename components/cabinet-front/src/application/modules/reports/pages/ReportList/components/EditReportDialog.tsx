import React from 'react';
import { translate } from 'react-translate';
import { Tab, Tabs } from '@mui/material';

import FullScreenDialogRaw from 'components/FullScreenDialog';
import ReportDesigner from 'components/StimulSoft/ReportDesigner';
import ReportViewer from 'components/StimulSoft/ReportViewer';

const FullScreenDialog = FullScreenDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface ReportData {
  template?: unknown;
  [key: string]: unknown;
}

interface ReportValue {
  data: ReportData;
  [key: string]: unknown;
}

interface EditReportDialogProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  report: ReportValue;
  onChange?: (value: ReportValue) => void;
  onClose: () => void;
  onInteraction?: (event: unknown) => void;
}

const EditReportDialog = ({ t, report, onChange, onClose, onInteraction }: EditReportDialogProps) => {
  const [activeTab, setActiveTab] = React.useState(0);

  const handleChange = React.useCallback(
    (newTemplate: unknown) => {
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
      {activeTab === 1 ? <ReportViewer report={report as never} onInteraction={onInteraction} /> : null}
    </FullScreenDialog>
  );
};

export default translate('ReportListPage')(EditReportDialog as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
