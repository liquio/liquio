// Stimulsoft Reports is loaded at runtime via <script> tags (see
// helpers/scriptLoader), attaching itself to `window.Stimulsoft`. It ships
// no types. Scoped to exactly what ReportContainer/ReportViewer/ReportDesigner
// use — every constructed instance and nested options object is a loosely
// typed Record, matched with casts at each deeper property access site.
interface StimulsoftConstructable {
  new (...args: unknown[]): Record<string, unknown>;
}

interface StimulsoftGlobal {
  Base: {
    Localization: {
      StiLocalization: {
        addLocalizationFile: (data: unknown, isDefault: boolean, culture: string) => void;
        cultureName: string;
      };
    };
    StiLicense: {
      Key: string | undefined;
    };
  };
  Viewer: {
    StiViewerOptions: StimulsoftConstructable;
    StiPrintDestination: Record<string, unknown>;
    StiViewer: StimulsoftConstructable;
  };
  Report: {
    StiReport: StimulsoftConstructable;
    Export: {
      StiHtmlExportMode: Record<string, unknown>;
    };
  };
  System: {
    Data: {
      DataSet: StimulsoftConstructable;
    };
  };
  Designer: {
    StiDesignerOptions: StimulsoftConstructable;
    StiDesigner: StimulsoftConstructable;
  };
}

declare global {
  interface Window {
    Stimulsoft: StimulsoftGlobal;
  }
}

export {};
