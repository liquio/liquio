import React from 'react';
import ReportContainer from 'components/StimulSoft/ReportContainer';

const ReportViewer = ({ report = {}, requestData, onInteraction }) => {
  const init = React.useCallback(
    async (ref) => {
      var options = new window.Stimulsoft.Viewer.StiViewerOptions();
      options.height = '100%';
      options.appearance.scrollbarsMode = true;
      options.toolbar.showDesignButton = false;
      options.toolbar.printDestination =
        window.Stimulsoft.Viewer.StiPrintDestination.Direct;
      options.appearance.htmlRenderMode =
        window.Stimulsoft.Report.Export.StiHtmlExportMode.Table;

      var viewer = new window.Stimulsoft.Viewer.StiViewer(
        options,
        'StiViewer',
        false,
      );

      var reportData = new window.Stimulsoft.Report.StiReport();

      if (requestData) {
        try {
          const data = await requestData();
          // reportData.dictionary.databases.clear();
          var dataSet = new window.Stimulsoft.System.Data.DataSet('JSON');
          dataSet.readJson(data);
          reportData.regData('JSON', 'JSON', dataSet);
        } catch (e) {
          // Nothing to do
        }
      }

      reportData.load(report.data.template);

      viewer.report = reportData;
      viewer.onInteraction = onInteraction;
      viewer.renderHtml(ref);
    },
    [report.data.template, requestData, onInteraction],
  );

  return <ReportContainer init={init} />;
};

export default ReportViewer;
