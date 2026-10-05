/**
 * @format
 */

import './src/helpers/imagePatch';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import { playRing, stopRing } from './src/utils/ringState';

const RING_TIMEOUT_MS = 20000;
// Bumped on every background ring so an older notification's timeout can't
// cut off a ring that a newer notification (re)started in the meantime.
let ringToken = 0;

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('FCM Notification (background/quit):', remoteMessage);

  const notifType = (remoteMessage?.data?.type || '').toUpperCase();
  const isBookingNotification = notifType.includes('BOOKING') || notifType.includes('NEW_PARCEL_BOOKING');

  if (isBookingNotification) {
    // Routes through the same native SoundHelper used for in-app booking
    // requests, so the Mute Ring button (and Accept/Reject) can always stop
    // it, and a second notification never orphans the first one's sound.
    const token = ++ringToken;
    playRing();
    setTimeout(() => {
      if (token === ringToken) {
        stopRing();
      }
    }, RING_TIMEOUT_MS);
  }
});

AppRegistry.registerComponent(appName, () => App);
