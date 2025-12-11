import renderHTML from 'helpers/renderHTML';

export default ({ body, params }) => renderHTML(body || '', params);
