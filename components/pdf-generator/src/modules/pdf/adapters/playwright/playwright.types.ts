export type PlaywrightOptions = {
  timeout: number;
  format: string;
  landscape: boolean;
  scale: number;
  height: string;
  width: string;
  printBackground: boolean;
  displayHeaderFooter: boolean;
  footerTemplate?: string;
  headerTemplate?: string;
  tagged: boolean;
  margin: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
};
