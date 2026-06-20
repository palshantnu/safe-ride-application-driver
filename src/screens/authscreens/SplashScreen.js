import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  StatusBar,
  useWindowDimensions,
  Easing,
} from 'react-native';
import FastImage from 'react-native-fast-image';

const SplashScreen = () => {
  const { width, height } = useWindowDimensions();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />


     <FastImage
  source={require('../../assets/welcome.gif')}
  style={[styles.backgroundGif, { width, height }]}
/>

      
    </View>
  ); 
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },

  backgroundGif: {
    position: 'absolute',
    top: 0,
    left: 0,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  content: {
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 2,
  },

  badge: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 20,
  },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    color: '#EAEAEA',
    textAlign: 'center',
    lineHeight: 24,
  },
});