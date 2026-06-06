import { combineReducers } from 'redux';
import { authReducer } from './reducers/auth';
import { common } from './reducers/common/common';

export default combineReducers({
  auth: authReducer,
  common,
});