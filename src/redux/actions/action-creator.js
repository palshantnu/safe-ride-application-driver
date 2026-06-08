import {
  SIGN_IN_REQUEST,
  SIGN_IN_SUCCESS,
  SIGN_IN_FAILURE,
  SIGN_UP_REQUEST,
  SIGN_UP_SUCCESS,
  SIGN_UP_FAILURE,
  LOGOUT_SUCCESS,
  SEND_OTP_REQUEST,
  SEND_OTP_SUCCESS,
  SEND_OTP_FAILURE,
  VERIFY_OTP_REQUEST,
  VERIFY_OTP_SUCCESS,
  VERIFY_OTP_FAILURE,
  DRIVER_SIGNUP_REQUEST,
  DRIVER_SIGNUP_SUCCESS,
  DRIVER_SIGNUP_FAILURE,
  ALL_SERVICES_REQUEST,
  ALL_SERVICES_SUCCESS,
  ALL_SERVICES_FAILURE,
  SUB_SERVICES_SUCCESS,
  SUB_SERVICES_FAILURE,
  SUB_SERVICES_REQUEST,
  B_DRIVER_SIGNUP_SUCCESS,
  B_DRIVER_SIGNUP_FAILURE,
  B_DRIVER_SIGNUP_REQUEST,
  SEND_BA_OTP_SUCCESS,
  SEND_BA_OTP_FAILURE,
  SEND_BA_OTP_REQUEST,
  VERIFY_BA_OTP_REQUEST,
  VERIFY_BA_OTP_SUCCESS,
  VERIFY_BA_OTP_FAILURE,
  KYC_DOCUMENT_SUCCESS,
  KYC_DOCUMENT_REQUEST,
  KYC_DOCUMENT_FAILURE,
  GET_PROFILE_REQUEST,
  GET_PROFILE_SUCCESS,
  GET_PROFILE_FAILURE,
  KYC_DOCUMENT_LIST_REQUEST,
  KYC_DOCUMENT_LIST_SUCCESS,
  KYC_DOCUMENT_LIST_FAILURE,
  GET_ONLINE_STATUS_REQUEST,
  GET_ONLINE_STATUS_SUCCESS,
  GET_ONLINE_STATUS_FAILURE,
} from './action-types';

import EndPoints from '../../services/EndPoints';
import axiosinstance from '../../axios/axiosinstance';

const CommonError = {
  message: 'Something Went Wrong',
  status: false,
};

// User Sign In
export const SIGNIN = (data) => (dispatch) => {
  dispatch({ type: SIGN_IN_REQUEST });

  return axiosinstance.post(EndPoints.authLogin, data)
    .then((response) => {
      if (response.data.message === 'Success') {
        dispatch({
          type: SIGN_IN_SUCCESS,
          payload: response.data,
        });
      }
      return response.data;
    })
    .catch((error) => {
      dispatch({ type: SIGN_IN_FAILURE });
      throw error;
    });
};

// User Sign Up
export const SIGNUP = (data) => (dispatch) => {
  dispatch({ type: SIGN_UP_REQUEST });

  return axiosinstance.post(EndPoints.signup, data)
    .then((response) => {
      if (response.data.success) {
        dispatch({
          type: SIGN_UP_SUCCESS,
          payload: response.data.result,
        });
      }
      return response.data;
    })
    .catch((error) => {
      dispatch({ type: SIGN_UP_FAILURE });
      throw error;
    });
};

// Send OTP for Driver Registration
export const SEND_OTP = (mobile) => (dispatch) => {
  dispatch({ type: SEND_OTP_REQUEST });
  console.log('mobile', mobile);

  return axiosinstance.post(EndPoints.sendOtp, { mobile })
    .then((response) => {
      if (response.data.success) {
        dispatch({
          type: SEND_OTP_SUCCESS,
          payload: response.data,
        });
      }
      return response.data;
    })
    .catch((error) => {
      dispatch({ type: SEND_OTP_FAILURE });
      throw error;
    });
};
export const VERIFY_DRIVER_OTP = (data) => (dispatch) => {
  dispatch({ type: VERIFY_OTP_REQUEST });

  return axiosinstance.post(EndPoints.driverRegister, data)
    .then((response) => {
      console.log('Driver Register Response:', response.data);

      if (response.data) {
        dispatch({
          type: DRIVER_SIGNUP_SUCCESS,
          payload: response.data,
        });
      }
      return response.data;
    })
    .catch((error) => {
      console.log('Driver Register Error:', error);
      dispatch({ type: DRIVER_SIGNUP_FAILURE });
      throw error;
    });
};

// Verify OTP for Driver Registration
export const VERIFY_OTP = (mobile, otp) => (dispatch) => {
  dispatch({ type: VERIFY_OTP_REQUEST });
  console.log('dmdkw');

  return axiosinstance.post(EndPoints.verifyOtp, { mobile, otp })
    .then((response) => {
      console.log('dmdkw');
      console.log('response', response);

      if (response.data.status) {
        dispatch({
          type: VERIFY_OTP_SUCCESS,
          payload: response.data,
        });
      }
      return response.data;
    })
    .catch((error) => {
      console.log('dmdkw');
      console.log('error', error.response?.data);
      console.log('status', error.response?.status);

      dispatch({ type: VERIFY_OTP_FAILURE });
      throw error.response?.data || CommonError;
    });
};

export const All_Services = () => (dispatch) => {
  dispatch({ type: ALL_SERVICES_REQUEST });
  console.log('EndPoints.allservices', EndPoints.allservices);

  return axiosinstance.get(EndPoints.allservices)
    .then((response) => {
      console.log('response', response.data);

      if (response.data.length !== 0) {
        dispatch({
          type: ALL_SERVICES_SUCCESS,
          payload: response.data,
        });
      }
      return response.data;
    })
    .catch((error) => {
      console.log('error->', error);
      dispatch({ type: ALL_SERVICES_FAILURE });
      throw error;
    });
};
export const GET_SUB_SERVICES = (serviceId) => (dispatch) => {
  dispatch({ type: SUB_SERVICES_REQUEST });

  return axiosinstance.get(`${EndPoints.allsubservices}/${serviceId}`)
    .then((response) => {
      console.log('sub services response', response.data);

      dispatch({
        type: SUB_SERVICES_SUCCESS,
        payload: response.data.data,
      });

      return response.data;
    })
    .catch((error) => {
      console.log('sub services error', error);
      dispatch({ type: SUB_SERVICES_FAILURE });
      throw error;
    });
};



export const businessAssociateSignUp = (data) => (dispatch) => {
  dispatch({ type: B_DRIVER_SIGNUP_REQUEST });

  return axiosinstance.post(EndPoints.businessAssociateSignUp, data)
    .then((response) => {
      console.log('response===>', response);

      if (response.data.success) {
        dispatch({
          type: B_DRIVER_SIGNUP_SUCCESS,
          payload: response.data.result,
        });
      }
      return response.data;
    })
    .catch((error) => {
      dispatch({ type: B_DRIVER_SIGNUP_FAILURE });
      throw error;
    });
};

// Add these to your action-creator.js file

// Send OTP for Business Associate Registration
export const SEND_BA_OTP = (ba_mobile) => (dispatch) => {
  dispatch({ type: SEND_BA_OTP_REQUEST });

  return axiosinstance.post(EndPoints.baSendOtp, { ba_mobile })
    .then((response) => {
      console.log('BA Send OTP Response:', response.data);

      if (response.data.message === 'OTP sent') {
        dispatch({
          type: SEND_BA_OTP_SUCCESS,
          payload: response.data,
        });
      }
      return response.data;
    })
    .catch((error) => {
      console.log('BA Send OTP Error:', error);
      dispatch({ type: SEND_BA_OTP_FAILURE });
      throw error;
    });
};

// Verify OTP and Register Business Associate
export const VERIFY_BA_OTP = (data) => (dispatch) => {
  dispatch({ type: VERIFY_BA_OTP_REQUEST });
  console.log('dedede');

  return axiosinstance.post(EndPoints.baRegister, data)
    .then((response) => {


      if (response.data.message === 'Login/Register successful' || response.data.message === 'Login successful') {
        console.log('BA Register Response:', response.data);
        dispatch({
          type: VERIFY_BA_OTP_SUCCESS, // Reusing existing success type
          payload: response.data,
        });
      }
      return response.data;
    })
    .catch((error) => {
      console.log('BA Register Error:', error);
      dispatch({ type: VERIFY_BA_OTP_FAILURE });
      throw error;
    });
};
export const VERIFY_BA_LOGIN = (data) => (dispatch) => {
  dispatch({ type: VERIFY_OTP_REQUEST });

  return axiosinstance.post(EndPoints.baVerifyLogin, data)
    .then((response) => {
      console.log('BA Verify Login Response:', response.data);

      if (response.data.message === 'Login successful') {
        dispatch({
          type: SIGN_IN_SUCCESS,
          payload: response.data,
        });
      }
      return response.data;
    })
    .catch((error) => {
      // console.log('BA Verify Login Error:', error);
      dispatch({ type: VERIFY_OTP_FAILURE });
      throw error;
    });
};



export const KYC_DOCUMENT = () => (dispatch) => {
  dispatch({ type: KYC_DOCUMENT_REQUEST });


  return axiosinstance.get(EndPoints.driverkycdocument)
    .then((response) => {
      console.log('response', response.data);

      if (response.data.success) {
        dispatch({
          type: KYC_DOCUMENT_SUCCESS,
          payload: response.data,
        });
      }
      return response.data;
    })
    .catch((error) => {
      console.log('error->', error);
      dispatch({ type: KYC_DOCUMENT_FAILURE });
      throw error;
    });
};

export const SUBMIT_KYC = (formData) => (dispatch) => {
  return axiosinstance.post(
    EndPoints.uploadKyc,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )
    .then((response) => {
      console.log('KYC Submit Response:', response.data);
      return response.data;
    })
    .catch((error) => {
      console.log('KYC Submit Error:', error?.response?.data || error);

      throw error;
    });
};
export const KYC_DOCUMENT_LIST = () => (dispatch) => {
  dispatch({ type: KYC_DOCUMENT_LIST_REQUEST });


  return axiosinstance.get(EndPoints.driverkycdocumentlist)
    .then((response) => {
      console.log('response--', response.data);

      if (response.data.status) {
        dispatch({
          type: KYC_DOCUMENT_LIST_SUCCESS,
          payload: response.data,
        });
      }
      return response.data;
    })
    .catch((error) => {
      console.log('error->', error);
      dispatch({ type: KYC_DOCUMENT_LIST_FAILURE });
      throw error;
    });
};

export const UPDATE_PROFILE = (formData) => (dispatch) => {
  return axiosinstance.post(
    EndPoints.updateProfile,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )
    .then((response) => {
      console.log('Profile Update Response:', response.data);
      return response.data;
    })
    .catch((error) => {
      console.log('Profile Update Error:', error?.response?.data || error);

      throw error;
    });
};

export const GET_PROFILE = () => (dispatch) => {
  dispatch({ type: GET_PROFILE_REQUEST });


  return axiosinstance.get(EndPoints.driverprofile)
    .then((response) => {
      console.log('response---', response.data);

      if (response.data.status) {
        dispatch({
          type: GET_PROFILE_SUCCESS,
          payload: response.data,
        });
      }
      return response.data;
    })
    .catch((error) => {
      console.log('error->', error);
      dispatch({ type: GET_PROFILE_FAILURE });
      throw error;
    });
};

export const GET_ONLINE_STATUS = (data) => (dispatch) => {
  dispatch({ type: GET_ONLINE_STATUS_REQUEST });

  return axiosinstance.get(EndPoints.getOnlineStatus)
    .then((response) => {
      console.log('get online status', response.data);

      if (response.data.status) {
        dispatch({
          type: GET_ONLINE_STATUS_SUCCESS,
          payload: response.data,
        });
      }
      return response.data;
    })
    .catch((error) => {
      // console.log('BA Verify Login Error:', error);
      dispatch({ type: GET_ONLINE_STATUS_FAILURE });
      throw error;
    });
};
export const UPDATE_ONLINE_STATUS = (data) => (dispatch) => {
  dispatch({ type: KYC_DOCUMENT_REQUEST }); // ya apna custom type bana lo

  return axiosinstance.put(
    EndPoints.updateOnlineStatus,
    data
  )
    .then((response) => {
      console.log('Update Online Status:', response.data);

      return response.data;
    })
    .catch((error) => {
      console.log('Online Status Error:', error?.response?.data || error);
      throw error;
    });
};



export const GET_BOOKING_REQUESTS = () => (dispatch) => {
  return axiosinstance.get('/driver/getbookingrequestlist')
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
        console.log('Cancel Booking Error:', error);
        console.log('error', error.response?.data);
      console.log('status', error.response?.status);
      console.log('Booking Request Error:', error);
      throw error;
    });
};

export const ACCEPT_BOOKING = (data) => (dispatch) => {
  return axiosinstance.post('/driver/acceptBooking', data)
    .then((response) => {
      console.log('Accept Booking Response:', response.data);
      return response.data;
    })
    .catch((error) => {
     console.log('Cancel Booking Error:', error);
        console.log('error', error.response?.data);
      console.log('status', error.response?.status);
      throw error;
    });
};
export const CANCEL_BOOKING = (data) => (dispatch) => {
  console.log('data',data);
  
  return axiosinstance.post('/CancelBooking', data)
    .then((response) => {
      console.log('cancel Booking Response:', response.data);
      return response.data;
    })
    .catch((error) => {
      console.log('Cancel Booking Error:', error);
        console.log('error', error.response?.data);
      console.log('status', error.response?.status);
      throw error;
    });
};
export const REJECT_BOOKING = (data) => (dispatch) => {
  console.log('data---->',data.role);
  
  return axiosinstance.post(data.role === 'business_associate' ? '/ba/rejectbooking' : '/driver/rejectBooking', data)
    .then((response) => {
      console.log('cancel Booking Response:', response.data);
      return response.data;
    })
    .catch((error) => {
      console.log('Cancel Booking Error:', error);
        console.log('error', error.response?.data);
      console.log('status', error.response?.status);
      throw error;
    });
};

export const GET_CURRENT_BOOKING = () => (dispatch) => {
  return axiosinstance.get('/driver/getCurrentBooking')
    .then((res) => res.data)
    .catch((err) => {
      console.log('GET_CURRENT_BOOKING Error', err);
      throw err;
    });
};

export const BA_GET_CURRENT_BOOKING = () => async (_dispatch) => {
  try {
    const response = await axiosinstance.get(EndPoints.baCurrentBooking);
    return response.data;
  } catch (error) {
    console.log('BA_GET_CURRENT_BOOKING Error', error);
    return { status: false, data: null };
  }
};

// Fetch BA services for self-sharing
export const BA_GET_SERVICES = () => async (_dispatch) => {
  try {
    const response = await axiosinstance.get(EndPoints.baServices);
    return response.data;
  } catch (error) {
    console.log('BA_GET_SERVICES Error', error);
    return { status: false, message: error?.response?.data?.message || error?.message || 'Network error', data: [] };
  }
};


export const DRIVER_ARRIVED = (data) => async (_dispatch) => {
  try {
    const response = await axiosinstance.post('/driver/arrived', data);
    return response.data;
  } catch (error) {
    console.log('DRIVER_ARRIVED Error', error);
    return { status: false, message: error.response?.data?.message || 'Network error' };
  }
};

export const START_RIDE = (formData) => (dispatch) => {
  return axiosinstance.post('/driver/bookingverifyOtp', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data);
};

export const START_IN_CITY_RIDE = (data) => () => {
  return axiosinstance.post('/driver/bookingverifyOtp', data)
    .then(res => res.data);
};

export const COMPLETE_IN_CITY_RIDE = (data) => () => {
  return axiosinstance.post('/driver/completeRide', data)
    .then(res => res.data);
};

export const REQUEST_TOPUP = (formData) => (dispatch) => {
  return axiosinstance.post('/driver/requestTopup', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data);
};

export const COMPLETE_RIDE = (formData) => async (_dispatch) => {
  try {
    const response = await axiosinstance.post('/driver/completeRide', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    console.log('COMPLETE_RIDE Error', error);
    return { status: false, message: error.response?.data?.message || 'Network error' };
  }
};

export const VERIFY_TOPUP = (data) => (dispatch) => {
  return axiosinstance.post('/driver/verifyTopupOtp', data)
    .then(res => res.data);
};

export const GET_DRIVER_BOOKING_HISTORY = () => async (dispatch) => {
  try {
    const response = await axiosinstance.get(EndPoints.driverBookingHistory);
    return response.data;
  } catch (error) {
    console.log('Error in GET_DRIVER_BOOKING_HISTORY:', error);
    return { status: false, message: error.response?.data?.message || 'Network error', data: [] };
  }
};

export const GET_BA_BOOKING_HISTORY = () => async (_dispatch) => {
  try {
    const response = await axiosinstance.get(EndPoints.baBookings);
    return response.data;
  } catch (error) {
    console.log('Error in GET_BA_BOOKING_HISTORY:', error);
    return { status: false, message: error.response?.data?.message || 'Network error', data: [] };
  }
};

export const BA_ACCEPT_BOOKING = (data) => async (_dispatch) => {
  console.log('data',data);
  
  try {
    const response = await axiosinstance.post(EndPoints.baAcceptBooking, data);
    return response.data;
  } catch (error) {
    console.log('Error in BA_ACCEPT_BOOKING:', error);
     console.log('Cancel Booking Error:', error);
        console.log('error', error.response?.data);
      console.log('status', error.response?.status);  
    return { status: false, message: error.response?.data?.message || 'Network error' };
  }
};

export const BA_ASSIGN_DRIVER = (data) => async (_dispatch) => {
  try {
    const response = await axiosinstance.post(EndPoints.baAssignDriver, data);
    return response.data;
  } catch (error) {
    console.log('Error in BA_ASSIGN_DRIVER:', error);
    return { status: false, message: error.response?.data?.message || 'Network error' };
  }
};

export const BA_CREATE_DRIVER = (data) => async (_dispatch) => {
  try {
    const response = await axiosinstance.post(EndPoints.baCreateDriver, data);
    return response.data;
  } catch (error) {
    console.log('Error in BA_CREATE_DRIVER:', error);
    return { status: false, message: error.response?.data?.message || 'Network error' };
  }
};

export const BA_GET_DRIVER_LIST = () => async (_dispatch) => {
  try {
    const response = await axiosinstance.get(EndPoints.baDriverList);
    return response.data;
  } catch (error) {
    console.log('Error in BA_GET_DRIVER_LIST:', error);
    return { status: false, message: error.response?.data?.message || 'Network error', data: [] };
  }
};

export const GET_INVOICE = (data) => async () => {
  try {
    const response = await axiosinstance.post(EndPoints.getInvoice, data);
    return response.data;
  } catch (error) {
    console.log('GET_INVOICE Error', error);
    return { status: false, message: error.response?.data?.message || 'Network error' };
  }
};

export const COLLECT_PAYMENT_COMPLETE_RIDE = (data) => async () => {
  try {
    const response = await axiosinstance.post(EndPoints.collectPaymentCompleteRide, data);
    return response.data;
  } catch (error) {
    console.log('Error in BA_ACCEPT_BOOKING:', error);
     console.log('Cancel Booking Error:', error);
        console.log('error', error.response?.data);
      console.log('status', error.response?.status);  
    console.log('COLLECT_PAYMENT_COMPLETE_RIDE Error', error);
    return { status: false, message: error.response?.data?.message || 'Network error' };
  }
};

// Logout
export const LOGOUT = () => (dispatch) => {
  dispatch({ type: LOGOUT_SUCCESS });
};