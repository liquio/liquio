import renderHTML from 'helpers/renderHTML';

interface TextTokenProps {
  body?: string;
  params?: { disableTabIndex?: boolean };
}

export default ({ body, params }: TextTokenProps) => renderHTML(body || '', params);
