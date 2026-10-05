import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { subscribeRingState, stopRing } from '../utils/ringState';

// Floating button shown app-wide only while the booking-request ring is
// playing, so the captain can silence it without acting on the request.
const RingMuteButton = () => {
  const [isRinging, setIsRinging] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeRingState(setIsRinging);
    return unsubscribe;
  }, []);

  if (!isRinging) return null;

  return (
    <TouchableOpacity style={styles.button} onPress={stopRing} activeOpacity={0.8}>
      <Icon name="bell-off" size={16} color="#fff" />
      <Text style={styles.text}>Mute Ring</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 55,
    right: 16,
    zIndex: 999,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#37474F',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

export default RingMuteButton;
