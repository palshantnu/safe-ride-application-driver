import { ALL_SERVICES_SUCCESS, SET_APP_LANGUAGE, SUB_SERVICES_SUCCESS } from '../../actions/action-types';

const initialState = {
  appLanguage: 'en',
  theme: 'theme1',
  allServices: [],
  subServices: [],
}

export const common = (state = initialState, { type, payload }) => {
  switch (type) {
    case SET_APP_LANGUAGE:
      return { ...state, appLanguage: payload }
    case ALL_SERVICES_SUCCESS:
      return {
        ...state,
        allServices: payload || [],
      }
    case SUB_SERVICES_SUCCESS:
      return {
        ...state,
        subServices: payload || [],
      };
    default:
      return state
  }
}