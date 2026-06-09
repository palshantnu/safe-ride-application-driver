import axiosinstance from '../axios/axiosinstance';

// Base URL already comes from axiosinstance.baseURL: `${Config}/api/`
// So these paths are relative to `/api/`

const logAxiosError = (error, meta = {}) => {
  // Helps surface server validation/error body in console.
  const status = error?.response?.status;
  const data = error?.response?.data;
  // eslint-disable-next-line no-console
  console.log('[SelfSharingService] request failed', {
    status,
    meta,
    responseData: data,
    message: error?.message,
  });
};

const SelfSharingService = {
  createTrip: async (payload) => {
    try {
      return await axiosinstance.post('/selfsharing/trip/create', payload);
    } catch (error) {
      logAxiosError(error, { action: 'createTrip', payload });
      throw error;
    }
  },

  getMyTrips: async (page = 1, limit = 10) => {
    try {
      return await axiosinstance.get('selfsharing/trip/my-trips', {
        params: {
          page,
          limit,
        },
      });
    } catch (error) {
      logAxiosError(error, { action: 'getMyTrips', page, limit });
      throw error;
    }
  },

  getTripDetails: async (tripId) => {
    try {
      return await axiosinstance.get(`selfsharing/trip/${tripId}`);
    } catch (error) {
      logAxiosError(error, { action: 'getTripDetails', tripId });
      throw error;
    }
  },

  arrive: async (payload) => {
    try {
      return await axiosinstance.post('selfsharing/trip/arrive', payload);
    } catch (error) {
      logAxiosError(error, { action: 'arrive', payload });
      throw error;
    }
  },

  verifyOtp: async (payload) => {
    try {
      return await axiosinstance.post('/selfsharing/trip/verify-otp', payload);
    } catch (error) {
      logAxiosError(error, { action: 'verifyOtp', payload });
      throw error;
    }
  },

  startRide: async (payload) => {
    try {
      return await axiosinstance.post('/selfsharing/trip/start', payload);
    } catch (error) {
      logAxiosError(error, { action: 'startRide', payload });
      throw error;
    }
  },

  completeRide: async (payload) => {
    try {
      return await axiosinstance.post('/selfsharing/trip/complete', payload);
    } catch (error) {
      logAxiosError(error, { action: 'completeRide', payload });
      throw error;
    }
  },

  cancelRide: async (payload) => {
    try {
      return await axiosinstance.post('/selfsharing/trip/cancel', payload);
    } catch (error) {
      logAxiosError(error, { action: 'cancelRide', payload });
      throw error;
    }
  },
};


export default SelfSharingService;



