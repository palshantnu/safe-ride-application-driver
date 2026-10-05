import { NativeModules } from 'react-native';

const { SoundHelper } = NativeModules;

let isRinging = false;
let listeners = [];

const setRingingState = (value) => {
  isRinging = value;
  listeners.forEach((listener) => listener(isRinging));
};

// Lets any screen/component (e.g. a floating mute button) react to the ring
// starting/stopping without needing its own local state.
export const subscribeRingState = (listener) => {
  listeners.push(listener);
  listener(isRinging);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};

export const isRingPlaying = () => isRinging;

export const playRing = () => {
  SoundHelper?.playNotificationSound();
  setRingingState(true);
};

export const stopRing = () => {
  SoundHelper?.stopNotificationSound();
  setRingingState(false);
};
