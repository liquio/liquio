const initialState = {
  list: {},
  pdfDocuments: {},
  previews: {}
};

const DOWNLOAD_FILE_DECODED = 'DOWNLOAD_FILE_DECODED';
const DOWNLOAD_DOCUMENT_ATTACH_DECODED = 'DOWNLOAD_DOCUMENT_ATTACH_DECODED';
const CLEAR_DOCUMENT_ATTACH_DECODED = 'CLEAR_DOCUMENT_ATTACH_DECODED';

const GET_PDF_DOCUMENT_DECODED = 'GET_PDF_DOCUMENT_DECODED';

const DOWNLOAD_FILE_PREVIEW_DECODED = 'DOWNLOAD_FILE_PREVIEW_DECODED';
const DOWNLOAD_DOCUMENT_ATTACH_PREVIEW_DECODED = 'DOWNLOAD_DOCUMENT_ATTACH_PREVIEW_DECODED';

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case DOWNLOAD_FILE_DECODED:
    case DOWNLOAD_DOCUMENT_ATTACH_DECODED: {
      return {
        ...state,
        list: {
          ...state.list,
          [action.id]: action.payload
        }
      };
    }
    case CLEAR_DOCUMENT_ATTACH_DECODED: {
      return {
        ...state,
        list: {}
      };
    }
    case GET_PDF_DOCUMENT_DECODED: {
      return {
        ...state,
        pdfDocuments: {
          ...state.pdfDocuments,
          [action.id]: action.payload
        }
      };
    }
    case DOWNLOAD_FILE_PREVIEW_DECODED:
    case DOWNLOAD_DOCUMENT_ATTACH_PREVIEW_DECODED: {
      return {
        ...state,
        previews: {
          ...state.previews,
          [action.id]: action.payload
        }
      };
    }
    default:
      return state;
  }
};
export default rootReducer;
