// `file-saver` ships no types and no @types package is installed. The real
// module (see its own src/FileSaver.js) exports a single `saveAs` function
// that also carries itself as a `.saveAs` property (`saveAs.saveAs = saveAs`),
// so both `import saveAs from 'file-saver'; saveAs(...)` (PrintReportButton.tsx)
// and `import FileSaver from 'file-saver'; FileSaver.saveAs(...)`
// (WorkflowSettings/index.tsx) are genuinely valid at runtime — typed here to
// support both call styles rather than picking one.
declare module 'file-saver' {
  interface FileSaverStatic {
    (data: Blob, filename?: string): void;
    saveAs(data: Blob, filename?: string): void;
  }
  const saveAs: FileSaverStatic;
  export default saveAs;
}
