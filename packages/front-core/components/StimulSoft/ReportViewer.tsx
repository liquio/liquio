import React from 'react';
import ReportContainer from 'components/StimulSoft/ReportContainer';

interface Report {
  data: { template?: unknown };
}

interface ReportViewerProps {
  report?: Report;
  requestData?: () => Promise<unknown>;
  onInteraction?: (...args: unknown[]) => void;
}

const ReportViewer = ({ report = {} as Report, requestData, onInteraction }: ReportViewerProps) => {
  const init = React.useCallback(
    async (ref: HTMLElement) => {
      const options = new window.Stimulsoft.Viewer.StiViewerOptions();
      options.height = '100%';
      (options.appearance as Record<string, unknown>).scrollbarsMode = true;
      (options.toolbar as Record<string, unknown>).showDesignButton = false;
      (options.toolbar as Record<string, unknown>).printDestination =
        window.Stimulsoft.Viewer.StiPrintDestination.Direct;
      (options.appearance as Record<string, unknown>).htmlRenderMode =
        window.Stimulsoft.Report.Export.StiHtmlExportMode.Table;

      const viewer = new window.Stimulsoft.Viewer.StiViewer(
        options,
        'StiViewer',
        false,
      );

      const reportData = new window.Stimulsoft.Report.StiReport();

      if (requestData) {
        try {
          const data = await requestData();
          // reportData.dictionary.databases.clear();
          const dataSet = new window.Stimulsoft.System.Data.DataSet('JSON');
          (dataSet as unknown as { readJson: (data: unknown) => void }).readJson(data);
          (reportData as unknown as { regData: (a: string, b: string, c: unknown) => void }).regData(
            'JSON',
            'JSON',
            dataSet,
          );
        } catch (e) {
          // Nothing to do
        }
      }

      (reportData as unknown as { load: (template: unknown) => void }).load(report.data.template);

      viewer.report = reportData;
      viewer.onInteraction = onInteraction;
      (viewer as unknown as { renderHtml: (ref: HTMLElement) => void }).renderHtml(ref);
    },
    [report.data.template, requestData, onInteraction],
  );

  return <ReportContainer init={init} />;
};

export default ReportViewer;
