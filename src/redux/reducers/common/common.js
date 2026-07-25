import {
  ALL_SERVICES_SUCCESS,
  SET_APP_LANGUAGE,
  SUB_SERVICES_SUCCESS,
  GET_NOTIFICATIONS_REQUEST,
  GET_NOTIFICATIONS_SUCCESS,
  GET_NOTIFICATIONS_FAILURE,
} from '../../actions/action-types';

const initialState = {
  appLanguage: 'en',
  theme: 'theme1',
  allServices: [],
  subServices: [],
  notifications: [],
  notificationsLoading: false,
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
    case GET_NOTIFICATIONS_REQUEST:
      return {
        ...state,
        notificationsLoading: true,
      };
    case GET_NOTIFICATIONS_SUCCESS:
      return {
        ...state,
        notifications: payload?.data || [],
        notificationsLoading: false,
      };
    case GET_NOTIFICATIONS_FAILURE:
      return {
        ...state,
        notificationsLoading: false,
      };
    default:
      return state
  }
}
