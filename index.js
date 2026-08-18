/**
 * @format
 */

import './src/helpers/imagePatch';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import Sound from 'react-native-sound';
import App from './App';
import { name as appName } from './app.json';

Sound.setCategory('Playback');

const RING_TIMEOUT_MS = 20000;
let bgSound = null;

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('FCM Notification (background/quit):', remoteMessage);

  const notifType = (remoteMessage?.data?.type || '').toUpperCase();
  const isBookingNotification = notifType.includes('BOOKING') || notifType.includes('NEW_PARCEL_BOOKING');

  if (isBookingNotification) {
    try {
      bgSound = new Sound('notification.mp3', Sound.MAIN_BUNDLE, error => {
        if (error) {
          console.log('BG ring load error:', error);
          return;
        }
        bgSound.setNumberOfLoops(-1);
        bgSound.play();
      });
      setTimeout(() => {
        bgSound?.stop(() => bgSound?.release());
      }, RING_TIMEOUT_MS);
    } catch (e) {
      console.log('BG ring error:', e);
    }
  }
});

AppRegistry.registerComponent(appName, () => App);
