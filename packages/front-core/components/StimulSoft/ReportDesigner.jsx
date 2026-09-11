import React from 'react';
import ReportContainer from 'components/StimulSoft/ReportContainer';

const ReportDesigner = ({ template, onChange }) => {
  const init = React.useCallback(
    async (ref) => {
      console.log('Loading Designer view');

      console.log('Set full screen mode for the designer');
      var options = new window.Stimulsoft.Designer.StiDesignerOptions();
      options.height = '100%';
      options.appearance.fullScreenMode = false;

      console.log('Create the report designer with specified options');
      var designer = new window.Stimulsoft.Designer.StiDesigner(
        options,
        'StiDesigner',
        false,
      );

      console.log('Create a new report instance');
      var stiReport = new window.Stimulsoft.Report.StiReport();

      console.log('Load report from url');
      stiReport.load(template);

      console.log('Edit report template in the designer');
      designer.report = stiReport;

      designer.onSaveReport = (args) =>
        onChange && onChange(JSON.parse(args.report.saveToJsonString()));

      designer.renderHtml(ref);
    },
    [onChange, template],
  );

  return <ReportContainer init={init} />;
};

export default ReportDesigner;
