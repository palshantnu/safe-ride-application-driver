import axiosinstance from '../axios/axiosinstance'
import EndPoints from './EndPoints'

export const loginService = (data) => 
  axiosinstance.post(EndPoints.authLogin, data)

export const signupService = (data) => 
  axiosinstance.post(EndPoints.signup, data)

export const fetchPagesByRole = (payload) =>
  axiosinstance.post(EndPoints.pagesByRole, payload).then((response) => response.data)

// Optional: Add these if needed for your authentication flow
// export const logoutService = () => 
//   axiosinstance.post(EndPoints.logout)
// 
// export const refreshTokenService = (refreshToken) => 
//   axiosinstance.post(EndPoints.refreshToken, { refreshToken })
// 
// export const forgotPasswordService = (email) => 
//   axiosinstance.post(EndPoints.forgotPassword, { email })
// 
// export const resetPasswordService = (token, newPassword) => 
//   axiosinstance.post(EndPoints.resetPassword, { token, newPassword })

export const rechargeWallet = (data) =>
  axiosinstance.post(EndPoints.rechargeWallet, data)

export const fetchRechargeHistory = () =>
  axiosinstance.get(EndPoints.rechargeHistory)

export const fetchWithdrawalHistory = () =>
  axiosinstance.get(EndPoints.driverWithdrawalHistory)

export const withdrawWallet = (data) =>
  axiosinstance.post(EndPoints.driverWithdrawalRequest, data)

export default {
  loginService,
  signupService,
  fetchPagesByRole,
  rechargeWallet,
  fetchRechargeHistory,
  fetchWithdrawalHistory,
  withdrawWallet,
}