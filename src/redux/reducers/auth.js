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
  B_DRIVER_SIGNUP_REQUEST,
  B_DRIVER_SIGNUP_SUCCESS,
  B_DRIVER_SIGNUP_FAILURE,
  SEND_BA_OTP_REQUEST,
  SEND_BA_OTP_SUCCESS,
  SEND_BA_OTP_FAILURE,
  VERIFY_BA_OTP_REQUEST,
  VERIFY_BA_OTP_SUCCESS,
  VERIFY_BA_OTP_FAILURE,
  KYC_DOCUMENT_SUCCESS,
  GET_PROFILE_SUCCESS,
  KYC_DOCUMENT_LIST_SUCCESS,
  KYC_DOCUMENT_LIST_FAILURE,
  GET_ONLINE_STATUS_SUCCESS,
} from "../actions/action-types"

const initialState = {
  // User Auth
  userData: null,
  loginToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Driver OTP States
  isSendingOtp: false,
  isVerifyingOtp: false,
  otpSent: false,
  otpVerified: false,
  otpData: null,

  // Business Associate OTP States
  isBASendingOtp: false,
  isBAVerifyingOtp: false,
  baOtpSent: false,
  baOtpVerified: false,
  baOtpData: null,

  // Driver Signup States
  isDriverSigningUp: false,
  driverSignupSuccess: false,
  driverSignupData: null,

  // Business Associate Signup States
  isBASigningUp: false,
  baSignupSuccess: false,
  baSignupData: null,

  driverKycDocuments: [],
  driverKycDocumentsList: [],
  driverProfileData: {},
  driveronlineStatus: null,
}

export const authReducer = (state = initialState, { type, payload }) => {
  switch (type) {
    // ==================== USER SIGN IN ====================
    case SIGN_IN_REQUEST:
      return {
        ...state,
        isLoading: true,
        error: null,
      }
    case SIGN_IN_SUCCESS:
      return {
        ...state,
        userData: payload?.result || payload?.user || payload?.ba,
        loginToken: payload?.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }
    case SIGN_IN_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: payload?.message || 'Sign in failed',
        isAuthenticated: false,
      }

    // ==================== USER SIGN UP ====================
    case SIGN_UP_REQUEST:
      return {
        ...state,
        isLoading: true,
        error: null,
      }
    case SIGN_UP_SUCCESS:
      return {
        ...state,
        userData: payload?.result || payload?.user,
        loginToken: payload?.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }
    case SIGN_UP_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: payload?.message || 'Sign up failed',
        isAuthenticated: false,
      }

    // ==================== DRIVER OTP ====================
    case SEND_OTP_REQUEST:
      return {
        ...state,
        isSendingOtp: true,
        otpSent: false,
        error: null,
      }
    case SEND_OTP_SUCCESS:
      return {
        ...state,
        isSendingOtp: false,
        otpSent: true,
        otpData: payload,
        error: null,
      }
    case SEND_OTP_FAILURE:
      return {
        ...state,
        isSendingOtp: false,
        otpSent: false,
        error: payload?.message || 'Failed to send OTP',
      }

    // ==================== DRIVER VERIFY OTP ====================
    case VERIFY_OTP_REQUEST:
      return {
        ...state,
        isVerifyingOtp: true,
        otpVerified: false,
        error: null,
      }
    case VERIFY_OTP_SUCCESS:
      return {
        ...state,
        isVerifyingOtp: false,
        otpVerified: true,
        userData: payload?.driver || payload?.driver || payload?.result || payload?.user,
        loginToken: payload?.token,
        error: null,
        isAuthenticated: true,
      }
    case VERIFY_OTP_FAILURE:
      return {
        ...state,
        isVerifyingOtp: false,
        otpVerified: false,
        error: payload?.message || 'OTP verification failed',
      }

    // ==================== BUSINESS ASSOCIATE OTP ====================
    case SEND_BA_OTP_REQUEST:
      return {
        ...state,
        isBASendingOtp: true,
        baOtpSent: false,
        error: null,
      }
    case SEND_BA_OTP_SUCCESS:
      return {
        ...state,
        isBASendingOtp: false,
        baOtpSent: true,
        baOtpData: payload,
        error: null,
      }
    case SEND_BA_OTP_FAILURE:
      return {
        ...state,
        isBASendingOtp: false,
        baOtpSent: false,
        error: payload?.message || 'Failed to send OTP',
      }

    // ==================== BUSINESS ASSOCIATE VERIFY OTP ====================
    case VERIFY_BA_OTP_REQUEST:
      return {
        ...state,
        isBAVerifyingOtp: true,
        baOtpVerified: false,
        error: null,
      }
    case VERIFY_BA_OTP_SUCCESS:
      return {
        isDriverSigningUp: false,
        driverSignupSuccess: true,
        driverSignupData: payload,
        userData: payload?.ba || payload?.driver || payload?.result || payload?.user,
        loginToken: payload?.token,
        isAuthenticated: true,
        error: null,
      }
    case VERIFY_BA_OTP_FAILURE:
      return {
        ...state,
        isBAVerifyingOtp: false,
        baOtpVerified: false,
        error: payload?.message || 'OTP verification failed',
      }

    // ==================== DRIVER SIGNUP ====================
    case DRIVER_SIGNUP_REQUEST:
      return {
        ...state,
        isDriverSigningUp: true,
        driverSignupSuccess: false,
        error: null,
      }
    case DRIVER_SIGNUP_SUCCESS:
      return {
        ...state,
        isDriverSigningUp: false,
        driverSignupSuccess: true,
        driverSignupData: payload,
        userData: payload?.driver || payload?.driver || payload?.result || payload?.user,
        loginToken: payload?.token,
        isAuthenticated: true,
        error: null,
      }
    case DRIVER_SIGNUP_FAILURE:
      return {
        ...state,
        isDriverSigningUp: false,
        driverSignupSuccess: false,
        error: payload?.message || 'Driver signup failed',
      }

    // ==================== BUSINESS ASSOCIATE SIGNUP ====================
    case B_DRIVER_SIGNUP_REQUEST:
      return {
        ...state,
        isBASigningUp: true,
        baSignupSuccess: false,
        error: null,
      }
    case B_DRIVER_SIGNUP_SUCCESS:
      return {
        ...state,
        isBASigningUp: false,
        baSignupSuccess: true,
        baSignupData: payload,
        userData: payload?.ba || payload?.user,
        loginToken: payload?.token,
        isAuthenticated: true,
        error: null,
      }
    case B_DRIVER_SIGNUP_FAILURE:
      return {
        ...state,
        isBASigningUp: false,
        baSignupSuccess: false,
        error: payload?.message || 'Business associate signup failed',
      }




    case KYC_DOCUMENT_SUCCESS:
      return {
        ...state,
        driverKycDocuments: payload.data,
        error: null,
      }
    case KYC_DOCUMENT_LIST_SUCCESS:
      return {
        ...state,
        driverKycDocumentsList: payload.data,
        error: null,
      }
    case KYC_DOCUMENT_LIST_FAILURE:
      return {
        ...state,
        driverKycDocumentsList: [],
        error: null,
      }
    case GET_PROFILE_SUCCESS:
      return {
        ...state,
        driverProfileData: payload.data,
        error: null,
      }
    case GET_ONLINE_STATUS_SUCCESS:
      return {
        ...state,
        driveronlineStatus: payload.data,
        error: null,
      }

    // ==================== LOGOUT ====================
    case LOGOUT_SUCCESS:
      return {
        ...initialState,
      }

    default:
      return state
  }
}