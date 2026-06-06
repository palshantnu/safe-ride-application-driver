import { NativeModules, Platform } from 'react-native';

const { LocationService: NativeLocationService } = NativeModules;

const LocationService = {
  saveToken: (token) => {
    if (Platform.OS === 'android' && NativeLocationService) {
      NativeLocationService.saveToken(token);
    }
  },

  start: () => {
    if (Platform.OS === 'android' && NativeLocationService) {
      NativeLocationService.startLocationService();
    }
  },

  stop: () => {
    if (Platform.OS === 'android' && NativeLocationService) {
      NativeLocationService.stopLocationService();
    }
  },
};

export default LocationService;
