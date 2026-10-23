import { combineReducers } from 'redux';
import auth from 'reducers/auth';
import eds from 'reducers/eds';

export default combineReducers({
  auth,
  eds,
});
