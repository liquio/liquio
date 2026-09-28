import React from 'react';
import ReportContainer from 'components/StimulSoft/ReportContainer';

interface ReportDesignerProps {
  template?: unknown;
  onChange?: (data: unknown) => void;
}

const ReportDesigner = ({ template, onChange }: ReportDesignerProps) => {
  const init = React.useCallback(
    async (ref: HTMLElement) => {
      console.log('Loading Designer view');

      console.log('Set full screen mode for the designer');
      const options = new window.Stimulsoft.Designer.StiDesignerOptions();
      options.height = '100%';
      (options.appearance as Record<string, unknown>).fullScreenMode = false;

      console.log('Create the report designer with specified options');
      const designer = new window.Stimulsoft.Designer.StiDesigner(
        options,
        'StiDesigner',
        false,
      );

      console.log('Create a new report instance');
      const stiReport = new window.Stimulsoft.Report.StiReport();

      console.log('Load report from url');
      (stiReport as unknown as { load: (template: unknown) => void }).load(template);

      console.log('Edit report template in the designer');
      designer.report = stiReport;

      designer.onSaveReport = (args: unknown) =>
        onChange &&
        onChange(
          JSON.parse(
            (args as { report: { saveToJsonString: () => string } }).report.saveToJsonString(),
          ),
        );

      (designer as unknown as { renderHtml: (ref: HTMLElement) => void }).renderHtml(ref);
    },
    [onChange, template],
  );

  return <ReportContainer init={init} />;
};

export default ReportDesigner;
