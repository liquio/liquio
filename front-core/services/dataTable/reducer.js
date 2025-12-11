import dispatchType from 'services/dataTable/dispatchType';
import mapDataDefault from 'services/dataTable/mapDataDefault';

import _ from 'lodash/fp';
import cleanDeep from 'clean-deep';
import objectPath from 'object-path';
import storage from 'helpers/storage';

const GET_LIST = 'GET_LIST';
const ON_ERROR_CLOSE = 'ON_ERROR_CLOSE';
const GET_LIST_SUCCESS = 'GET_LIST_SUCCESS';
const GET_LIST_FAIL = 'GET_LIST_FAIL';

const CLEAR_FILTERS = 'CLEAR_FILTERS';

const ON_ROW_SELECT = 'ON_ROW_SELECT';
const ON_CHANGE_PAGE = 'ON_CHANGE_PAGE';
const ON_SEARCH_CHANGE = 'ON_SEARCH_CHANGE';
const ON_FILTER_CHANGE = 'ON_FILTER_CHANGE';
const COLUMN_SORT_CHANGE = 'COLUMN_SORT_CHANGE';
const ON_CHANGE_ROWS_PER_PAGE = 'ON_CHANGE_ROWS_PER_PAGE';
const UPDATE_RECORD_VALUES = 'UPDATE_RECORD_VALUES';

const ON_ROWS_RECOVER_SUCCESS = 'ON_ROWS_RECOVER_SUCCESS';
const ON_ROWS_DELETE_SUCCESS = 'ON_ROWS_DELETE_SUCCESS';
const ON_ROWS_DELETE_PERMANENT_SUCCESS = 'ON_ROWS_DELETE_PERMANENT_SUCCESS';
const TOGGLE_COLUMN_VISIBLE = 'TOGGLE_COLUMN_VISIBLE';
const SET_HIDDEN_COLUMNS = 'SET_HIDDEN_COLUMNS';

const ON_FILTER_PRESET_ADD = 'ON_FILTER_PRESET_ADD';
const ON_FILTER_PRESET_DELETE = 'ON_FILTER_PRESET_DELETE';

const initialState = ({ sourceName }) => ({
  loading: false,
  error: null,
  count: null,
  page: null,
  rowsPerPage: 10,
  data: null,
  rowsSelected: [],
  hiddenColumns: [],
  filters: {},
  presets: JSON.parse(storage.getItem('useTablePresets' + sourceName)) || [],
  search: '',
  sort: {},
});

export default (endPoint) =>
  (
    state = _.merge(initialState(endPoint), endPoint.defaultOptions),
    action,
  ) => {
    const { sourceName, mapData, reduce } = endPoint;

    if (reduce) {
      state = reduce(state, action);
    }

    switch (action.type) {
      case dispatchType(sourceName, ON_FILTER_PRESET_ADD): {
        const presets = [].concat(state.presets, action.payload);
        storage.setItem(
          'useTablePresets' + sourceName,
          JSON.stringify(presets),
        );
        return { ...state, presets };
      }
      case dispatchType(sourceName, ON_FILTER_PRESET_DELETE): {
        const presets = state.presets.filter(
          (preset, index) => index !== action.payload,
        );
        return { ...state, presets };
      }
      case dispatchType(sourceName, CLEAR_FILTERS):
        return initialState(endPoint);
      case dispatchType(sourceName, GET_LIST):
        return { ...state, loading: true };
      case dispatchType(sourceName, ON_ERROR_CLOSE):
        return {
          ...state,
          errors: state.errors.filter(
            (error, index) => index !== action.payload,
          ),
        };
      case dispatchType(sourceName, GET_LIST_SUCCESS):
        return {
          ...state,
          ...(mapData || mapDataDefault)(action.payload, state),
          loading: false,
        };
      case dispatchType(sourceName, GET_LIST_FAIL):
        return {
          ...state,
          loading: false,
          error: action.payload.message,
        };
      case dispatchType(sourceName, ON_ROW_SELECT):
        return { ...state, rowsSelected: action.payload };
      case dispatchType(sourceName, ON_CHANGE_PAGE):
        return { ...state, page: action.payload, rowsSelected: [] };
      case dispatchType(sourceName, ON_CHANGE_ROWS_PER_PAGE):
        return { ...state, rowsPerPage: action.payload, page: 0 };
      case dispatchType(sourceName, ON_SEARCH_CHANGE):
        return { ...state, search: action.payload };
      case dispatchType(sourceName, ON_FILTER_CHANGE):
        return { ...state, filters: action.payload, rowsSelected: [], page: 1 };
      case dispatchType(sourceName, COLUMN_SORT_CHANGE): {
        const { column, direction, hard } = action.payload;
        const sort = {};
        if (column && direction) {
          if (hard) {
            sort[column] = direction;
          } else {
            objectPath.set(sort, column, direction);
          }
        }
        return { ...state, sort };
      }
      case dispatchType(sourceName, UPDATE_RECORD_VALUES): {
        const { rowId, data, hard } = action.payload;
        const rowPosition = state.data.map(({ id }) => id).indexOf(rowId);

        let cleanDocument = cleanDeep(state.data[rowPosition], {
          emptyObjects: false,
          emptyArrays: false,
          nullValues: false,
        });

        if (hard) {
          Object.keys(data).forEach((key) => {
            cleanDocument.data[key] = data[key];
          });
        } else {
          cleanDocument = _.merge(cleanDocument, { data });
        }

        const document = cleanDeep(cleanDocument, {
          emptyObjects: false,
          emptyArrays: false,
          nullValues: false,
        });

        state.data[rowPosition] = document;
        return state;
      }
      case dispatchType(sourceName, ON_ROWS_RECOVER_SUCCESS):
      case dispatchType(sourceName, ON_ROWS_DELETE_SUCCESS):
      case dispatchType(sourceName, ON_ROWS_DELETE_PERMANENT_SUCCESS):
        return { ...state, rowsSelected: [] };
      case dispatchType(sourceName, TOGGLE_COLUMN_VISIBLE): {
        const { hiddenColumns } = state;

        if (hiddenColumns.includes(action.payload)) {
          hiddenColumns.splice(hiddenColumns.indexOf(action.payload), 1);
        } else {
          hiddenColumns.push(action.payload);
        }

        return { ...state, hiddenColumns: [...hiddenColumns] };
      }
      case dispatchType(sourceName, SET_HIDDEN_COLUMNS):
        return { ...state, hiddenColumns: action.payload };
      default:
        return state;
    }
  };
