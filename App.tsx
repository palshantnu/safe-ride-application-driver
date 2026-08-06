import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar, PermissionsAndroid, Platform } from 'react-native';
import { request as requestPermission, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { promptForEnableLocationIfNeeded } from 'react-native-android-location-enabler';
import messaging from '@react-native-firebase/messaging';

const App = () => {
  useEffect(() => {
    requestLocationPermission();
    requestNotificationPermission();

    // Foreground notifications
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('FCM Notification (foreground):', remoteMessage);
    });

    // App opened from background by tapping a notification
    const unsubscribeOnOpen = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('FCM Notification (opened from background):', remoteMessage);
    });

    // App opened from quit state by tapping a notification
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('FCM Notification (opened from quit state):', remoteMessage);
        }
      });

    return () => {
      unsubscribeOnMessage();
      unsubscribeOnOpen();
    };
  }, []);

const requestLocationPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Location permission granted');

        // GPS ON popup
        try {
          await promptForEnableLocationIfNeeded({
            interval: 10000,
            fastInterval: 5000,
          });

          console.log('GPS Enabled');
        } catch (error) {
          console.log('User cancelled GPS dialog', error);
        }
      } else {
        console.log('Location permission denied');
      }
    } catch (err) {
      console.warn(err);
    }
  }
};

const requestNotificationPermission = async () => {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Enable Notifications',
            message: 'Allow notifications so you stay updated on KYC and ride updates.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    }

    if (Platform.OS === 'ios') {
      const result = await requestPermission(PERMISSIONS.IOS.NOTIFICATIONS);
      return result === RESULTS.GRANTED;
    }

    return true;
  } catch (err) {
    console.warn(err);
    return false;
  }
};

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <StatusBar
            backgroundColor="#ff7f50"
            barStyle="dark-content"
            translucent
          />
          <SafeAreaView style={{ flex: 1, backgroundColor: '#ff7f50' }}>
            <AppNavigator />
          </SafeAreaView>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;