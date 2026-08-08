import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import DeviceInfo from 'react-native-device-info';
import axiosinstance from '../axios/axiosinstance';
import EndPoints from '../services/EndPoints';
import { compareVersions } from '../utils/versionCompare';

const DEFAULT_STORE_URL = 'https://play.google.com/store/apps/details?id=com.sigiridecaptain';
const CHECK_TIMEOUT_MS = 6000; // don't let a slow/dead backend hang app launch

// Wrap the app's root navigator with this. It checks the required app version on
// launch and, only when the admin has explicitly turned "force_update" on for a
// version newer than what's installed, replaces the whole app with a blocking
// "please update" screen — no back button, no way through except updating.
const ForceUpdateGate = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [blockInfo, setBlockInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const checkVersion = async () => {
      try {
        const platform = Platform.OS === 'ios' ? 'ios' : 'android';
        const res = await axiosinstance.get(EndPoints.appVersion, {
          params: { app: 'driver', platform },
          timeout: CHECK_TIMEOUT_MS,
        });
        const data = res?.data?.data;
        if (cancelled || !data?.force_update || !data?.min_version) return;

        const currentVersion = DeviceInfo.getVersion();
        if (compareVersions(currentVersion, data.min_version) < 0) {
          setBlockInfo(data);
        }
      } catch (e) {
        // network hiccup / backend down — fail open, don't block the app on this
        console.log('app-version check failed:', e.message);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    checkVersion();
    return () => { cancelled = true; };
  }, []);

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF1493" />
      </View>
    );
  }

  if (blockInfo) {
    return (
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Icon name="cloud-download-outline" size={48} color="#FF1493" />
        </View>
        <Text style={styles.title}>Update Required</Text>
        <Text style={styles.message}>
          {blockInfo.update_message || 'A new version of the app is available with important fixes. Please update to continue.'}
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => Linking.openURL(blockInfo.store_url || DEFAULT_STORE_URL)}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Update Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return children;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 12,
  },
  message: {
    fontSize: 14.5,
    color: '#666',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#FF1493',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 28,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ForceUpdateGate;
