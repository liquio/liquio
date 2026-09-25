/* eslint-disable @typescript-eslint/no-explicit-any */
export default (theme: any) => ({
  taskPreviewContainer: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },
  screenContainer: {
    position: 'relative',
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: 80
  },
  pdfPreview: {
    flex: 1,
    overflow: 'hidden'
  },
  download: {
    backgroundColor: theme?.palette?.background?.paper
  }
});
