export const getAuthToken = (state) => state.auth.loginToken;
export const getUserDataSelector = (state) => state.auth.userData;
export const getAppLanguageSelector = (state) => state.common.appLanguage;
export const getThemeSelector = (state) => state?.common?.theme;
export const getIsAuthenticated = (state) => state.auth.isAuthenticated;
export const getAuthLoading = (state) => state.auth.isLoading;
export const getAuthError = (state) => state.auth.error;