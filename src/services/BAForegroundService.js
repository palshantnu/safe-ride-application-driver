import { NativeModules, Platform } from 'react-native';

const { BAForegroundService: NativeBAForegroundService } = NativeModules;

const BAForegroundService = {
  start: () => {
    if (Platform.OS === 'android' && NativeBAForegroundService) {
      NativeBAForegroundService.start();
    }
  },

  stop: () => {
    if (Platform.OS === 'android' && NativeBAForegroundService) {
      NativeBAForegroundService.stop();
    }
  },
};

export default BAForegroundService;
