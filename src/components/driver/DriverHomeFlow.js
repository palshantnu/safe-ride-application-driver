import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  RefreshControl,
  Animated,
  ActivityIndicator,
  Image,
  TextInput,
  Modal,
  PermissionsAndroid,
  Platform,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { useDispatch, useSelector } from 'react-redux';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  ACCEPT_BOOKING,
  GET_BOOKING_REQUESTS,
  GET_ONLINE_STATUS,
  UPDATE_ONLINE_STATUS,
  DRIVER_ARRIVED,
  START_RIDE,
  REQUEST_TOPUP,
  COMPLETE_RIDE,
  GET_CURRENT_BOOKING,
  VERIFY_TOPUP,
  CANCEL_BOOKING,
  REJECT_BOOKING,
} from '../../redux/actions/action-creator';
import LocationService from '../../services/LocationService';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const { NativeModules } = require('react-native');
const { SoundHelper } = NativeModules;

const STATUS_COLORS = {
  ACCEPTED: '#4CAF50',
  TOKEN_PAID: '#FFC107',
  ARRIVED: '#00BCD4',
  STARTED: '#FF5722',
  TOPUP_PENDING: '#FF9800',
  BALANCE_PAID: '#4CAF50',
  COMPLETED: '#9E9E9E',
  CANCELLED: '#F44336',
  ASSIGNED: '#FF9800',
  PENDING: '#FFC107',
};

const STATUS_TEXT = {
  ACCEPTED: 'Ride Accepted',
  TOKEN_PAID: 'Token Paid',
  ARRIVED: 'Driver Arrived',
  STARTED: 'Ride Started',
  TOPUP_PENDING: 'Topup Pending',
  BALANCE_PAID: 'Balance Paid',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  ASSIGNED: 'Assigned',
  PENDING: 'Pending',
};

const DriverHomeFlow = ({ navigation }) => {
  const dispatch = useDispatch();

  const { userData } = useSelector((state) => state.auth);
  const driveronlineStatus = useSelector((state) => state?.auth?.driveronlineStatus);
  const loginToken = useSelector((state) => state?.auth?.loginToken);
  
  console.log('userData===>', userData);
  const prevOnSpotBookingRef = useRef(null);

  const isOnSpotCaptain = userData?.service_id === 77;

  // Check if driver has special service (72 or 73)
  const hasSpecialService = userData?.service_id === 72 || userData?.service_id === 73;

  // Get service name for display
  const getSpecialServiceName = () => {
    if (userData?.service_id === 72) return 'Self Sharing';
    if (userData?.service_id === 73) return 'Inter City';
    return '';
  };

  const [isOnline, setIsOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [rideRequest, setRideRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentRides, setCurrentRides] = useState([]);

  // On-spot (service_id = 77) state
  const [onSpotRequests, setOnSpotRequests] = useState([]);
  const [showOnSpotRejectModal, setShowOnSpotRejectModal] = useState(false);
  const [onSpotRejectReason, setOnSpotRejectReason] = useState('');
  const [selectedOnSpotBookingNo, setSelectedOnSpotBookingNo] = useState(null);
const [showCancelModal, setShowCancelModal] = useState(false);
const [cancelReason, setCancelReason] = useState('');
const [selectedBookingNo, setSelectedBookingNo] = useState('');

  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [extraKm, setExtraKm] = useState('');
  const [reason, setReason] = useState('');
  const [imageUri, setImageUri] = useState('');

  const [showTopupOtpModal, setShowTopupOtpModal] = useState(false);
  const [topupOtp, setTopupOtp] = useState('');
  const [selectedTopupId, setSelectedTopupId] = useState(null);

  const [showCompleteRideModal, setShowCompleteRideModal] = useState(false);
  const [meterKmText, setMeterKmText] = useState('');
  const [completeRideImageUri, setCompleteRideImageUri] = useState('');

  const [activeRideForAction, setActiveRideForAction] = useState(null);
  const [assigningBookingId, setAssigningBookingId] = useState(null);

  // animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const prevRideRequestIdRef = useRef(null);

  const animateRequest = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (loginToken) {
      LocationService.saveToken(loginToken);
    }
  }, [loginToken]);

  // Play ring on new driver booking request, stop when cleared
  useEffect(() => {
    if (rideRequest && rideRequest.id !== prevRideRequestIdRef.current) {
      prevRideRequestIdRef.current = rideRequest.id;
      SoundHelper?.playNotificationSound();
    } else if (!rideRequest) {
      prevRideRequestIdRef.current = null;
      SoundHelper?.stopNotificationSound();
    }
  }, [rideRequest]);
  
  useEffect(() => {
    if (!isOnSpotCaptain) return;

    const latestBookingNo = onSpotRequests?.[0]?.booking_no || onSpotRequests?.[0]?.id;

    if (latestBookingNo && latestBookingNo !== prevOnSpotBookingRef.current) {
      prevOnSpotBookingRef.current = latestBookingNo;
      SoundHelper?.playNotificationSound();
    }

    if (onSpotRequests?.length === 0) {
      prevOnSpotBookingRef.current = null;
      SoundHelper?.stopNotificationSound();
    }
  }, [onSpotRequests, isOnSpotCaptain]);
  
  // Stop sound on unmount
  useEffect(() => {
    return () => SoundHelper?.stopNotificationSound();
  }, []);

  const fetchOnSpotCurrentBookings = async () => {
    if (!isOnSpotCaptain) return;
    try {
      const axios = (await import('../../axios/axiosinstance')).default;
      const res = await axios.get('onspot/captain/currentbooking', {
        headers: { Authorization: `Bearer ${loginToken}` },
      });

      if (res?.data?.status && Array.isArray(res?.data?.data)) {
        setCurrentRides(res.data.data);
        setRideRequest(null);
      } else {
        setCurrentRides([]);
      }
    } catch (error) {
      console.log('Error fetching on-spot current bookings:', error);
      setCurrentRides([]);
    }
  };

  const fetchCurrentRide = async () => {
    try {
      if (isOnSpotCaptain) {
        await fetchOnSpotCurrentBookings();
        return;
      }

      const res = await dispatch(GET_CURRENT_BOOKING());
      if (res?.status && res?.data) {
        const bookings = Array.isArray(res.data) ? res.data : [res.data];
        setCurrentRides(bookings);
        setRideRequest(null);
      } else {
        setCurrentRides([]);
      }
    } catch (error) {
      console.log('Error fetching current ride:', error);
    }
  };

  const fetchOnSpotAvailableBookings = async () => {
    if (!isOnSpotCaptain) return;
    try {
      setOnSpotRequests([]);
      const axios = (await import('../../axios/axiosinstance')).default;

      const res = await axios.get('onspot/captain/available', {
        headers: { Authorization: `Bearer ${loginToken}` },
      });

      if (res?.data?.status && Array.isArray(res?.data?.data)) {
        const list = res.data.data;
        setOnSpotRequests(list);
        if (list.length > 0) animateRequest();
      } else {
        setOnSpotRequests([]);
      }
    } catch (error) {
      console.log('fetchOnSpotAvailableBookings error:', error);
      setOnSpotRequests([]);
    }
  };

  const fetchBookingRequests = async () => {
    if (hasSpecialService || isOnSpotCaptain) return;

    try {
      const res = await dispatch(GET_BOOKING_REQUESTS());
      if (res?.status && res?.data?.length > 0 && currentRides.length === 0) {
        const booking = res.data[0];
        console.log('New Booking Request:', booking);
        const formatted = {
          id: booking.id,
          booking_id: booking.booking_id,
          pickup: booking.pickup_address || booking.pickup_city,
          drop: booking.drop_address || booking.drop_city,
          to_city: booking.to_city,
          fare: booking.plan_price || booking.total_fare,
          distance: booking.plan_km || booking.distance || 'N/A',
          duration: booking.plan_hour || 'N/A',
          plan_name: booking.plan_name,
          person: booking.person,
          schedule_date: booking.schedule_date,
          service_name: booking.service_name,
          sub_service_name: booking.sub_service_name,
          _raw: booking,
          customer: {
            name: booking.user_name || 'Customer',
            rating: 4.5,
            phone: booking.user_mobile || 'N/A',
          },
          total_fare: booking.total_fare,
          driver_amount:booking.driver_amount
        };
        setRideRequest(formatted);
        animateRequest();
      } else {
        setRideRequest(null);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    let interval;
    if (isOnline) {
      fetchCurrentRide();
      fetchBookingRequests();

      if (isOnSpotCaptain) {
        fetchOnSpotAvailableBookings();
      }

      interval = setInterval(() => {
        if (currentRides.length > 0) {
          fetchCurrentRide();
        } else if (isOnSpotCaptain) {
          fetchOnSpotAvailableBookings();
        } else if (!hasSpecialService) {
          fetchBookingRequests();
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isOnline, currentRides.length, hasSpecialService, isOnSpotCaptain]);

  useEffect(() => {
    if (driveronlineStatus?.is_online !== undefined) {
      const online = driveronlineStatus.is_online === 1;
      setIsOnline(online);
      if (online) LocationService.start();
      else LocationService.stop();
    }
  }, [driveronlineStatus]);

  const fetchOnlineStatus = async () => {
    await dispatch(GET_ONLINE_STATUS());
  };

  useEffect(() => {
    fetchOnlineStatus();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCurrentRide();
      if (!hasSpecialService) await fetchBookingRequests();
    } finally {
      setRefreshing(false);
    }
  };

  const toggleOnlineStatus = (value) => {
    if (value) {
      Alert.alert('Go Online', 'You will start receiving ride requests.', [
        { text: 'Cancel', onPress: () => setIsOnline(false) },
        {
          text: 'Go Online',
          onPress: async () => {
            try {
              setIsLoading(true);
              await dispatch(UPDATE_ONLINE_STATUS({ is_online: 1 }));
              LocationService.start();
              setIsOnline(true);
              await fetchCurrentRide();
            } catch (error) {
              Alert.alert('Error', 'Failed to go online');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]);
    } else {
      Alert.alert('Go Offline', 'You will stop receiving ride requests.', [
        { text: 'Cancel', onPress: () => setIsOnline(true) },
        {
          text: 'Go Offline',
          onPress: async () => {
            try {
              setIsLoading(true);
              await dispatch(UPDATE_ONLINE_STATUS({ is_online: 0 }));
              LocationService.stop();
              setIsOnline(false);
              setCurrentRides([]);
              setRideRequest(null);
            } catch (error) {
              Alert.alert('Error', 'Failed to go offline');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]);
    }
  };

  const handleAccept = async () => {
    SoundHelper?.stopNotificationSound();
    try {
      setIsLoading(true);
      const res = await dispatch(
        ACCEPT_BOOKING({
          booking_id: rideRequest?.booking_id,
        })
      );

      if (res?.status) {
        if (rideRequest?.service_name === 'In City') {
          setRideRequest(null);
          navigation.navigate('InCityMap', {
            booking_id: rideRequest?.booking_id,
            bookingData: rideRequest?._raw,
          });
        } else {
          Alert.alert('Success', 'Ride accepted successfully');
          await fetchCurrentRide();
          setRideRequest(null);
        }
      } else {
        Alert.alert('Error', res?.message || 'Failed to accept ride');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    SoundHelper?.stopNotificationSound();
    Alert.alert('Reject Ride', 'Are you sure you want to reject this ride request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          const res = await dispatch(
            REJECT_BOOKING({
              role: 'driver',
              booking_id: rideRequest?.booking_id,
            })
          );

          if (res?.status) {
            Alert.alert('Success', 'Ride rejected successfully');
            await fetchCurrentRide();
            setRideRequest(null);
          } else {
            Alert.alert('Error', res?.message || 'Failed to reject ride');
          }
        },
      },
    ]);
  };

  const submitOnSpotAccept = async (bookingNo) => {
    SoundHelper?.stopNotificationSound();
    if (!bookingNo) return;

    try {
      setIsLoading(true);
      const axios = (await import('../../axios/axiosinstance')).default;
      const res = await axios.post('onspot/captain/accept', { booking_no: bookingNo }, {
        headers: { Authorization: `Bearer ${loginToken}` },
      });

      if (res?.data?.status) {
        Alert.alert('Success', 'On-spot booking accepted');
        await fetchCurrentRide();
        setOnSpotRequests([]);
      } else {
        Alert.alert('Error', res?.data?.message || 'Failed to accept');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const submitOnSpotReject = async () => {
    SoundHelper?.stopNotificationSound();
    if (!selectedOnSpotBookingNo) return;
    if (!onSpotRejectReason.trim()) {
      Alert.alert('Error', 'Please enter reject reason');
      return;
    }

    try {
      setIsLoading(true);
      const axios = (await import('../../axios/axiosinstance')).default;
      const res = await axios.post('onspot/captain/reject', {
        booking_no: selectedOnSpotBookingNo,
        cancel_reason: onSpotRejectReason.trim(),
      }, {
        headers: { Authorization: `Bearer ${loginToken}` },
      });

      if (res?.data?.status) {
        Alert.alert('Success', 'On-spot booking rejected');
        setShowOnSpotRejectModal(false);
        setOnSpotRejectReason('');
        setSelectedOnSpotBookingNo(null);
        if (isOnSpotCaptain) await fetchOnSpotAvailableBookings();
      } else {
        Alert.alert('Error', res?.data?.message || 'Failed to reject');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // OnSpot Arrive API
  const handleOnSpotArrived = async (bookingNo) => {
    Alert.alert('Arrived at Location', 'Have you arrived at the service location?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Arrived',
        onPress: async () => {
          setIsLoading(true);
          try {
            const axios = (await import('../../axios/axiosinstance')).default;
            const res = await axios.post('onspot/captain/arrive', 
              { booking_no: bookingNo },
              { headers: { Authorization: `Bearer ${loginToken}` } }
            );
          console.log('Arrive response:', res);
            if (res?.data?.status) {
              Alert.alert('Success', 'You have marked as arrived');
              await fetchCurrentRide();
            } else {
              Alert.alert('Error', res?.data?.message || 'Failed to update status');
            }
          } catch (error) {
            console.log('Arrive error:', error);
              console.log('Cancel Booking Error:', error);
        console.log('error', error.response?.data);
      console.log('status', error.response?.status); 
            Alert.alert('Error', error?.response?.data?.message || 'Something went wrong');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  // OnSpot Verify OTP and Start Service
  const handleOnSpotVerifyOtp = async (bookingNo) => {
    if (!enteredOtp) {
      Alert.alert('Error', 'Please enter OTP');
      return;
    }

    setIsLoading(true);
    try {
      const axios = (await import('../../axios/axiosinstance')).default;
      const res = await axios.post('onspot/captain/verify-otp', 
        { 
          booking_no: bookingNo, 
          otp: enteredOtp 
        },
        { headers: { Authorization: `Bearer ${loginToken}` } }
      );

      if (res?.data?.status) {
        Alert.alert('Success', 'OTP verified, service started');
        setShowOtpModal(false);
        setEnteredOtp('');
        setActiveRideForAction(null);
        await fetchCurrentRide();
      } else {
        Alert.alert('Error', res?.data?.message || 'Invalid OTP');
      }
    } catch (error) {
      console.log('Verify OTP error:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // OnSpot Complete Service API
  const handleOnSpotComplete = async (bookingNo) => {
    Alert.alert('Complete Service', 'Are you sure you want to complete this service?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Complete',
        onPress: async () => {
          setIsLoading(true);
          try {
            const axios = (await import('../../axios/axiosinstance')).default;
            const res = await axios.post('onspot/captain/complete', 
              { booking_no: bookingNo },
              { headers: { Authorization: `Bearer ${loginToken}` } }
            );

            if (res?.data?.status) {
              Alert.alert('Success', 'Service completed successfully');
              await fetchCurrentRide();
            } else {
              Alert.alert('Error', res?.data?.message || 'Failed to complete service');
            }
          } catch (error) {
            console.log('Complete error:', error);
            Alert.alert('Error', error?.response?.data?.message || 'Something went wrong');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  // OnSpot Cancel Booking API
  const handleOnSpotCancel = async (bookingNo, cancelReason = 'Cancelled by driver') => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setIsLoading(true);
          try {
            const axios = (await import('../../axios/axiosinstance')).default;
            const res = await axios.post('onspot/captain/cancel', 
              { 
                booking_no: bookingNo, 
                cancel_reason: cancelReason 
              },
              { headers: { Authorization: `Bearer ${loginToken}` } }
            );
console.log('Cancel Booking Response:', res);
            if (res?.data?.status) {
              Alert.alert('Cancelled', 'Booking has been cancelled');
              await fetchCurrentRide();
            } else {
              Alert.alert('Error', res?.data?.message || 'Failed to cancel booking');
            }
          } catch (error) {
            console.log('Cancel error:', error);
            Alert.alert('Error', error?.response?.data?.message || 'Something went wrong');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const permissions = [PermissionsAndroid.PERMISSIONS.CAMERA];
      if (Platform.Version >= 33) permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
      else permissions.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
      const results = await PermissionsAndroid.requestMultiple(permissions);
      return Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
    } catch {
      return false;
    }
  };

  const pickImage = () => {
    Alert.alert('Select Image', 'Choose image from', [
      { text: 'Camera', onPress: openCamera },
      { text: 'Gallery', onPress: openGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openCamera = async () => {
    const granted = await requestCameraPermission();
    if (!granted) {
      Alert.alert('Permission Denied', 'Camera permission is required to capture images.');
      return;
    }

    launchCamera(
      {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 800,
        maxWidth: 600,
        quality: 0.8,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Error', 'Failed to open camera');
          return;
        }
        if (response.assets?.[0]) setImageUri(response.assets[0].uri);
      }
    );
  };

  const openGallery = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 800,
        maxWidth: 600,
        quality: 0.8,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.error) {
          Alert.alert('Error', 'Failed to open gallery');
          return;
        }
        if (response.assets?.[0]) setImageUri(response.assets[0].uri);
      }
    );
  };

  const handleArrived = async (bookingId) => {
    Alert.alert('Arrived at Pickup', 'Have you arrived at the pickup location?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Arrived',
        onPress: async () => {
          setIsLoading(true);
          try {
            const res = await dispatch(DRIVER_ARRIVED({ booking_id: bookingId }));
            if (res?.status) {
              Alert.alert('Success', 'You have marked as arrived');
              await fetchCurrentRide();
            } else {
              Alert.alert('Error', res?.message || 'Failed to update status');
            }
          } catch {
            Alert.alert('Error', 'Something went wrong');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const isDriverServiceRide = (booking) => String(booking?.service_name || '').includes('Driver');

  const handleStartRide = (booking) => {
    setAssigningBookingId(booking?.booking_id || booking?.id);
    setActiveRideForAction(booking);
    setShowOtpModal(true);
  };

  const submitStartRide = async () => {
    if (!enteredOtp) {
      Alert.alert('Error', 'Please enter OTP');
      return;
    }

    const shouldUseMeterFields = !isDriverServiceRide(activeRideForAction);

    if (shouldUseMeterFields) {
      if (!meterKmText.trim()) return Alert.alert('Error', 'Please enter the meter reading (km)');
      if (!imageUri) return Alert.alert('Error', 'Please capture meter image');
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('booking_id', assigningBookingId);
      formData.append('otp', enteredOtp);

      if (shouldUseMeterFields) {
        formData.append('meter_text', meterKmText.trim());
        formData.append('image', {
          uri: imageUri,
          name: 'meter_image.jpg',
          type: 'image/jpeg',
        });
      }

      const res = await dispatch(START_RIDE(formData));
      if (res?.status) {
        Alert.alert('Success', 'Ride started successfully');
        setShowOtpModal(false);
        setEnteredOtp('');
        setMeterKmText('');
        setImageUri('');
        setAssigningBookingId(null);
        setActiveRideForAction(null);
        await fetchCurrentRide();
      } else {
        Alert.alert('Error', res?.message || 'Failed to start ride');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestTopup = (booking) => {
    setAssigningBookingId(booking?.booking_id || booking?.id);
    setActiveRideForAction(booking);
    setShowTopupModal(true);
  };

  const submitTopupRequest = async () => {
    if (!extraKm) return Alert.alert('Error', 'Please enter extra kilometers');
    if (!reason) return Alert.alert('Error', 'Please enter reason for topup');
    if (!imageUri) return Alert.alert('Error', 'Please capture meter image');

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('booking_id', assigningBookingId);
      formData.append('extra_km', extraKm);
      formData.append('reason', reason);
      formData.append('image', {
        uri: imageUri,
        name: 'meter_topup.jpg',
        type: 'image/jpeg',
      });

      const res = await dispatch(REQUEST_TOPUP(formData));
      if (res?.status) {
        Alert.alert('Success', 'Topup request sent successfully');
        setShowTopupModal(false);
        setExtraKm('');
        setReason('');
        setImageUri('');
        await fetchCurrentRide();
      } else {
        Alert.alert('Error', res?.message || 'Failed to request topup');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTopup = async () => {
    if (!topupOtp) return Alert.alert('Error', 'Enter OTP');
    setIsLoading(true);
    try {
      const res = await dispatch(VERIFY_TOPUP({ topup_id: selectedTopupId, otp: topupOtp }));
      if (res?.status) {
        Alert.alert('Success', 'Topup Verified');
        setShowTopupOtpModal(false);
        setTopupOtp('');
        fetchCurrentRide();
      } else {
        Alert.alert('Error', res?.message);
      }
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRide = (booking) => {
    setAssigningBookingId(booking?.booking_id || booking?.id);
    setActiveRideForAction(booking);
    setMeterKmText('');
    setCompleteRideImageUri('');
    setShowCompleteRideModal(true);
  };

  const openCompleteRideCamera = async () => {
    const granted = await requestCameraPermission();
    if (!granted) return Alert.alert('Permission Denied', 'Camera permission is required to capture images.');

    launchCamera(
      {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 800,
        maxWidth: 600,
        quality: 0.8,
      },
      (response) => {
        if (response.assets?.[0]) setCompleteRideImageUri(response.assets[0].uri);
      }
    );
  };

  const openCompleteRideGallery = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 800,
        maxWidth: 600,
        quality: 0.8,
      },
      (response) => {
        if (response.assets?.[0]) setCompleteRideImageUri(response.assets[0].uri);
      }
    );
  };

  const submitCompleteRide = async () => {
    const shouldUseMeterFields = !isDriverServiceRide(activeRideForAction);

    if (shouldUseMeterFields) {
      if (!completeRideImageUri) return Alert.alert('Error', 'Please capture the meter reading image');
      if (!meterKmText.trim()) return Alert.alert('Error', 'Please enter the meter reading (km)');
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('booking_id', assigningBookingId);

      if (shouldUseMeterFields) {
        formData.append('meter_text', meterKmText.trim());
        formData.append('image', {
          uri: completeRideImageUri,
          name: 'complete_ride_image.jpg',
          type: 'image/jpeg',
        });
      }

      const res = await dispatch(COMPLETE_RIDE(formData));
      if (res?.status) {
        setShowCompleteRideModal(false);
        setMeterKmText('');
        setCompleteRideImageUri('');
        setAssigningBookingId(null);
        setActiveRideForAction(null);
        Alert.alert('Success', 'Ride completed successfully');
        await fetchCurrentRide();
      } else {
        Alert.alert('Error', res?.message || 'Failed to complete ride');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRide = (bookingId) => {
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel this ride?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setIsLoading(true);
          try {
            const res = await dispatch(
              CANCEL_BOOKING({
                role: 'DRIVER',
                booking_id: bookingId,
                cancel_reason: 'Cancelled by driver',
              })
            );
            if (res?.status) {
              Alert.alert('Cancelled', 'Ride has been cancelled');
              await fetchCurrentRide();
            } else {
              Alert.alert('Error', res?.message || 'Failed to cancel ride');
            }
          } catch {
            Alert.alert('Error', 'Something went wrong');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const getStatusColor = (status) => STATUS_COLORS[status] || '#757575';
  const getStatusText = (status) => STATUS_TEXT[status] || status;

  // Render OnSpot current booking card
  const renderOnSpotActiveRide = (booking) => {
    if (!booking) return null;

    const bookingNo = booking.booking_no;
    const status = booking.status;
    console.log('Rendering On-Spot Booking:', bookingNo, 'Status:', status);
    const fullAddress = booking.full_address;
    const landmark = booking.landmark;
    const userName = booking.user_name;
    const userMobile = booking.user_mobile;
    const scheduleDateTime = booking.schedule_datetime;
    const planName = booking.plan_name;
    const totalAmount = booking.total_amount;
    const tokenAmount = booking.token_amount;
    const balanceAmount = booking.balance_amount;

    return (
      <Animated.View key={booking.id} style={styles.activeRideCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Text style={styles.statusBadgeText}>{getStatusText(status)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="map" size={14} color="#810a45" />
            <Text style={{ fontSize: 12, color: '#810a45', fontWeight: '600' }}>On-Spot</Text>
          </View>
        </View>

        <View style={styles.locationContainer}>
          <View style={styles.locationEntryRow}>
            <View style={styles.dotCol}>
              <View style={styles.pickupDot} />
            </View>
            <View style={styles.locationTextCol}>
              <Text style={styles.locationLabel}>Location</Text>
              <Text style={styles.pickupText}>{fullAddress || 'N/A'}</Text>
              {landmark ? (
                <Text style={[styles.dropText, { marginTop: 4 }]}>📍 {landmark}</Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.rideInfo}>
          <View style={styles.infoItem}>
            <Icon name="user" size={16} color="#666" />
            <Text style={styles.infoText}>{userName || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="phone" size={16} color="#666" />
            <Text style={styles.infoText}>{userMobile || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="tag" size={16} color="#666" />
            <Text style={styles.infoText}>{planName || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.paymentInfo}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Total Amount:</Text>
            <Text style={styles.totalAmount}>₹{totalAmount}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Token:</Text>
            <Text style={styles.tokenAmount}>₹{tokenAmount}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Balance:</Text>
            <Text style={styles.balanceAmount}>₹{balanceAmount}</Text>
          </View>
        </View>

        <View style={styles.rideInfo}>
          <View style={styles.infoItem}>
            <Icon name="calendar" size={16} color="#666" />
            <Text style={styles.infoText}>
              {scheduleDateTime ? new Date(scheduleDateTime).toLocaleString() : 'N/A'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="hash" size={16} color="#666" />
            <Text style={styles.infoText}>{bookingNo}</Text>
          </View>
        </View>

        {/* ASSIGNED status - Show Arrive button */}
        
        {status === 'TOKEN_PAID' && (
          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: '#00BCD4' }]}
            onPress={() => handleOnSpotArrived(bookingNo)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="navigation" size={20} color="#fff" />
                <Text style={styles.btnText}>Arrived at Location</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* ARRIVED status - Show Start Service button (opens OTP modal) */}
        {status === 'ARRIVED' && (
          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: '#FF9800' }]}
            onPress={() => {
              setActiveRideForAction(booking);
              setAssigningBookingId(bookingNo);
              setEnteredOtp('');
              setShowOtpModal(true);
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="play" size={20} color="#fff" />
                <Text style={styles.btnText}>Start Service</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* STARTED status - Show Complete button */}
        {status === 'IN_PROGRESS' && (
          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: '#4CAF50' }]}
            onPress={() => handleOnSpotComplete(bookingNo)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="check-circle" size={20} color="#fff" />
                <Text style={styles.btnText}>Complete Service</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* COMPLETED status - Show completion message */}
        {status === 'COMPLETED' && (
          <View style={styles.waitingCard}>
            <Icon name="check-circle" size={40} color="#4CAF50" />
            <Text style={styles.waitingTitle}>Service Completed</Text>
            <Text style={styles.waitingText}>Thank you for your service!</Text>
          </View>
        )}

        {/* Cancel button for non-completed statuses */}
        {status !== 'COMPLETED' && (
         <TouchableOpacity
  style={styles.cancelRideBtn}
  onPress={() => {
    setSelectedBookingNo(bookingNo);
    setCancelReason('');
    setShowCancelModal(true);
  }}
>
  <Icon name="x-circle" size={18} color="#FF5252" />
  <Text style={styles.cancelRideBtnText}>Cancel Booking</Text>
</TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  const renderActiveRide = (booking) => {
    console.log('Rendering Active Ride:',booking); 
    if (!booking) return null;

    // For OnSpot bookings, use special renderer
    if (isOnSpotCaptain) {
      return renderOnSpotActiveRide(booking);
    }

    const bookingId = booking.booking_id;
    const pickupLocation = booking.pickup_address || booking.pickup_city;
    const dropLocation = booking.drop_address || booking.drop_city;
    const status = booking.status;
    const latestTopup = booking.topups?.length ? booking.topups[booking.topups.length - 1] : null;

    if (booking.is_incity) {
      return (
        <Animated.View key={bookingId} style={styles.activeRideCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
              <Text style={styles.statusBadgeText}>{getStatusText(status)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="map" size={14} color="#FF1493" />
              <Text style={{ fontSize: 12, color: '#FF1493', fontWeight: '600' }}>In-City</Text>
            </View>
          </View>

          <View style={styles.locationContainer}>
            <View style={styles.locationEntryRow}>
              <View style={styles.dotCol}>
                <View style={styles.pickupDot} />
                <View style={styles.locationLine} />
              </View>
              <View style={styles.locationTextCol}>
                <Text style={styles.locationLabel}>Pickup</Text>
                <Text style={styles.pickupText}>{pickupLocation}</Text>
              </View>
            </View>
            <View style={styles.locationEntryRow}>
              <View style={styles.dotCol}>
                <View style={styles.dropDot} />
              </View>
              <View style={styles.locationTextCol}>
                <Text style={styles.locationLabel}>Drop</Text>
                <Text style={styles.dropText}>{dropLocation}</Text>
              </View>
            </View>
          </View>

          <View style={styles.rideInfo}>
            <View style={styles.infoItem}>
              <Icon name="user" size={16} color="#666" />
              <Text style={styles.infoText}>{booking.person} Passenger</Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="map-pin" size={16} color="#666" />
              <Text style={styles.infoText}>{booking.distance} km</Text>
            </View>
            {booking.sub_service_name ? (
              <View style={styles.infoItem}>
                <Icon name="tag" size={16} color="#666" />
                <Text style={styles.infoText}>{booking.sub_service_name}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: '#FF1493' }]}
            onPress={() =>
              navigation.navigate('InCityMap', {
                booking_id: bookingId,
                bookingData: booking,
              })
            }
          >
            <Icon name="map" size={20} color="#fff" />
            <Text style={styles.btnText}>Continue on Map</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    return (
      <Animated.View key={bookingId} style={styles.activeRideCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Text style={styles.statusBadgeText}>{getStatusText(status)}</Text>
          </View>
           <View>
          <Text style={styles.fareAmount}>₹{booking.driver_amount}</Text>
          <Text style={{...styles.fareAmount, color: '#000',fontSize:12}}>Total Amount ₹{booking.total_fare}</Text>
        </View>
        </View>

        <View style={styles.locationContainer}>
          <View style={styles.locationEntryRow}>
            <View style={styles.dotCol}>
              <View style={styles.pickupDot} />
              <View style={styles.locationLine} />
            </View>
            <View style={styles.locationTextCol}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.pickupText}>{pickupLocation}</Text>
            </View>
          </View>
          <View style={styles.locationEntryRow}>
            <View style={styles.dotCol}>
              <View style={styles.dropDot} />
              {(booking.service_name?.includes('Rental') || booking.service_name?.includes('Driver')) && booking.to_city ? (
                <View style={styles.locationLine} />
              ) : null}
            </View>
            <View style={styles.locationTextCol}>
              <Text style={styles.locationLabel}>Drop</Text>
              <Text style={styles.dropText}>{dropLocation}</Text>
            </View>
          </View>
          {booking.service_name?.includes('Rental') && booking.to_city ? (
            <View style={styles.locationEntryRow}>
              <View style={styles.dotCol}>
                <View style={styles.toCityDot} />
              </View>
              <View style={styles.locationTextCol}>
                <Text style={styles.locationLabel}>To City</Text>
                <Text style={styles.toCityText}>{booking.to_city}</Text>
              </View>
            </View>
          ) : null}
          {booking.service_name?.includes('Driver') && booking.to_city ? (
            <View style={styles.locationEntryRow}>
              <View style={styles.dotCol}>
                <View style={styles.toCityDot} />
              </View>
              <View style={styles.locationTextCol}>
                <Text style={styles.locationLabel}>To City</Text>
                <Text style={styles.toCityText}>{booking.to_city}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.rideInfo}>
          <View style={styles.infoItem}>
            <Icon name="user" size={16} color="#666" />
            <Text style={styles.infoText}>{booking.person} Passenger</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="clock" size={16} color="#666" />
            <Text style={styles.infoText}>{booking.plan_hour} Hour</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="map-pin" size={16} color="#666" />
            <Text style={styles.infoText}>{booking.plan_km} km</Text>
          </View>
        </View>

  {booking.token_paid == 1 &&    <View style={{...styles.customerInfo,justifyContent:'space-between',width:'100%'}}>
  <View style={styles.customerDetail}>
    <Icon name="phone" size={14} color="#999" />

    <Text style={styles.customerText}>
      {booking.user_mobile}
    </Text>

    <TouchableOpacity
      style={{ marginLeft: 70,
  backgroundColor: '#2196F3',
  padding: 8,
  borderRadius: 20,
  justifyContent: 'center',
  alignItems: 'center',
paddingHorizontal:20}}
      onPress={() => Linking.openURL(`tel:${booking.user_mobile}`)}
    >
     <Text style={{...styles.customerText,color:'#fff',textAlign:'center',fontWeight: '600'}}>
      <MaterialIcons name="call" size={18} color="#fff" />
    {'  '} Call User  
</Text>
    </TouchableOpacity>
  </View>
</View>}

        {(status === 'TOKEN_PAID' || status === 'ASSIGN') && (
          <TouchableOpacity style={styles.acceptBtn} onPress={() => handleArrived(bookingId)} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Icon name="navigation" size={20} color="#fff" />
                <Text style={styles.btnText}>Arrived at Pickup</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {status === 'BALANCE_PAID' && (
          <TouchableOpacity style={styles.acceptBtn} onPress={() => handleStartRide(booking)} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Icon name="play" size={20} color="#fff" />
                <Text style={styles.btnText}>Start Ride</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {status === 'STARTED' && (
          <View style={styles.buttonRow}>
            {!isDriverServiceRide(booking) && (
              <TouchableOpacity
                style={[styles.acceptBtn, { backgroundColor: '#FF9800', flex: 1 }]}
                onPress={() => handleRequestTopup(booking)}
                disabled={isLoading}
              >
                <Icon name="plus-circle" size={20} color="#fff" />
                <Text style={styles.btnText}>Request Topup</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: '#4CAF50', flex: 1 }]}
              onPress={() => handleCompleteRide(booking)}
              disabled={isLoading}
            >
              <Icon name="check-circle" size={20} color="#fff" />
              <Text style={styles.btnText}>Complete Ride</Text>
            </TouchableOpacity>
          </View>
        )}

        {['SEARCHING', 'ASSIGN', 'TOKEN_PAID', 'ARRIVED', 'ACCEPTED'].includes(status) && (
          <TouchableOpacity style={styles.cancelRideBtn} onPress={() => handleCancelRide(bookingId)} disabled={isLoading}>
            <Icon name="x-circle" size={18} color="#FF5252" />
            <Text style={styles.cancelRideBtnText}>Cancel Ride</Text>
          </TouchableOpacity>
        )}

        {status === 'TOPUP_PENDING' && latestTopup?.status !== 'PAID' && (
          <View style={styles.waitingCard}>
            <Icon name="clock" size={40} color="#FF9800" />
            <Text style={styles.waitingTitle}>Topup Request Pending</Text>
            <Text style={styles.waitingText}>Waiting for admin approval</Text>
          </View>
        )}

        {status === 'TOPUP_PENDING' && latestTopup?.status === 'PAID' && (
          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: '#2196F3' }]}
            onPress={() => {
              setSelectedTopupId(latestTopup.id);
              setShowTopupOtpModal(true);
            }}
          >
            <Icon name="shield" size={20} color="#fff" />
            <Text style={styles.btnText}>Verify Topup</Text>
          </TouchableOpacity>
        )}

        {status === 'COMPLETED' && (
          <View style={styles.waitingCard}>
            <Icon name="check-circle" size={40} color="#4CAF50" />
            <Text style={styles.waitingTitle}>Ride Completed</Text>
            <Text style={styles.waitingText}>Thank you for your service!</Text>
          </View>
        )}
      </Animated.View>
    );
  };

  const RideRequestCard = () => (
    <Animated.View style={[styles.requestCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {console.log('rideRequest',rideRequest)}
      <View style={styles.cardHeader}>
        <View style={styles.requestBadge}>
          <Icon name="bell" size={16} color="#fff" />
          <Text style={styles.requestBadgeText}>New Ride Request</Text>
        </View>
        <View>
          <Text style={styles.fareAmount}>₹{rideRequest.driver_amount}</Text>
          <Text style={{...styles.fareAmount, color: '#000',fontSize:12}}>Total Amount ₹{rideRequest.total_fare}</Text>
        </View>
        
      </View>
      <View style={{...styles.requestBadge,backgroundColor:'#2196F3',marginTop:-10,marginBottom:15,alignSelf:'flex-start'}}>
      <Icon name="bell" size={16} color="#fff" />
      <Text style={styles.requestBadgeText}>{rideRequest.service_name}</Text>
      </View>
      <View style={styles.locationContainer}>
        <View style={styles.locationEntryRow}>
          <View style={styles.dotCol}>
            <View style={styles.pickupDot} />
            <View style={styles.locationLine} />
          </View>
          <View style={styles.locationTextCol}>
            <Text style={styles.locationLabel}>Pickup</Text>
            <Text style={styles.pickupText}>{rideRequest.pickup}</Text>
          </View>
        </View>

        <View style={styles.locationEntryRow}>
          <View style={styles.dotCol}>
            <View style={styles.dropDot} />
            {rideRequest.service_name?.includes('Rental') && rideRequest.to_city ? <View style={styles.locationLine} /> : null}
          </View>
          <View style={styles.locationTextCol}>
            <Text style={styles.locationLabel}>Drop</Text>
            <Text style={styles.dropText}>{rideRequest.drop}</Text>
          </View>
        </View>

        {rideRequest.service_name?.includes('Rental') && rideRequest.to_city ? (
          <View style={styles.locationEntryRow}>
            <View style={styles.dotCol}>
              <View style={styles.toCityDot} />
            </View>
            <View style={styles.locationTextCol}>
              <Text style={styles.locationLabel}>To City</Text>
              <Text style={styles.toCityText}>{rideRequest.to_city}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.rideInfo}>
        <View style={styles.infoItem}>
          <Icon name="user" size={16} color="#666" />
          <Text style={styles.infoText}>{rideRequest.person} Passenger</Text>
        </View>
        <View style={styles.infoItem}>
          <Icon name="clock" size={16} color="#666" />
          <Text style={styles.infoText}>{rideRequest.duration} Hour</Text>
        </View>
        <View style={styles.infoItem}>
          <Icon name="map-pin" size={16} color="#666" />
          <Text style={styles.infoText}>{rideRequest.distance} km</Text>
        </View>
      </View>

      <View style={styles.customerInfo}>
        <View style={styles.customerDetail}>
          <Icon name="phone" size={14} color="#999" />
          <Text style={styles.customerText}>{rideRequest.customer.phone}</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.rejectBtn} onPress={handleReject} disabled={isLoading}>
          <Icon name="x" size={20} color="#fff" />
          <Text style={styles.btnText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Icon name="check" size={20} color="#fff" />
              <Text style={styles.btnText}>Accept</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const OnSpotRequestCard = ({ booking }) => {
    const bookingNo = booking?.booking_no;
    const pickupText = booking?.full_address;
    const landmarkText = booking?.landmark;
    const fare = booking?.total_amount;

    return (
      <Animated.View
        style={[styles.requestCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.requestBadge, { backgroundColor: '#810a45' }]}>
            <Icon name="bell" size={16} color="#fff" />
            <Text style={styles.requestBadgeText}>On-spot Booking</Text>
          </View>
          <Text style={styles.fareAmount}>₹{fare}</Text>
        </View>

        <View style={styles.locationContainer}>
          <View style={styles.locationEntryRow}>
            <View style={styles.dotCol}>
              <View style={styles.pickupDot} />
            </View>
            <View style={styles.locationTextCol}>
              <Text style={styles.locationLabel}>Location</Text>
              <Text style={styles.pickupText}>{pickupText || 'N/A'}</Text>
              {landmarkText ? (
                <Text style={[styles.dropText, { marginTop: 4 }]}>📍 {landmarkText}</Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.rideInfo}>
          <View style={styles.infoItem}>
            <Icon name="calendar" size={16} color="#666" />
            <Text style={styles.infoText}>
              {booking?.schedule_datetime
                ? new Date(booking.schedule_datetime).toLocaleString()
                : 'N/A'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="tag" size={16} color="#666" />
            <Text style={styles.infoText}>{bookingNo || booking?.id}</Text>
          </View>
        </View>

        <View style={styles.paymentInfo}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Token: ₹{booking?.token_amount}</Text>
            <Text style={styles.paymentLabel}>Balance: ₹{booking?.balance_amount}</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => {
              setSelectedOnSpotBookingNo(bookingNo || booking?.id);
              setOnSpotRejectReason('');
              setShowOnSpotRejectModal(true);
            }}
            disabled={isLoading}
          >
            <Icon name="x" size={20} color="#fff" />
            <Text style={styles.btnText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => submitOnSpotAccept(bookingNo || booking?.id)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="check" size={20} color="#fff" />
                <Text style={styles.btnText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const StatsCard = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Icon name="calendar" size={24} color="#FF1493" />
        <Text style={styles.statValue}>0</Text>
        <Text style={styles.statLabel}>Today's Rides</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Icon name="rupee" size={24} color="#4CAF50" />
        <Text style={styles.statValue}>₹0</Text>
        <Text style={styles.statLabel}>Today's Earnings</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Icon name="star" size={24} color="#FFD700" />
        <Text style={styles.statValue}>4.8</Text>
        <Text style={styles.statLabel}>Rating</Text>
      </View>
    </View>
  );

  const isDriverFlow = userData?.service_id === 71 ? true : false;

  return (
    <View style={styles.outer}>
      <View style={styles.specialTripActions}>
        {hasSpecialService && (
          <>
            {userData?.service_id === 72 || userData?.service_id === 73 ? (
              <>
                <Text style={styles.specialTripTitle}>Self Sharing Trips</Text>

                <View style={styles.specialTripBtnRow}>
                  <TouchableOpacity
                    style={[styles.specialTripBtn, { backgroundColor: '#2196F3' }]}
                    onPress={() => navigation.navigate('SelfSharingCreateTrip', { service_id: userData?.service_id })}
                  >
                    <Icon name="plus-circle" size={18} color="#fff" />
                    <Text style={styles.specialTripBtnText}>Create Booking</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.specialTripBtn, { backgroundColor: '#4CAF50' }]}
                    onPress={() => navigation.navigate('SelfSharingMyTrips')}
                  >
                    <Icon name="list" size={18} color="#fff" />
                    <Text style={styles.specialTripBtnText}>My Trips</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusInfo}>
          <Icon name={isOnline ? "circle" : "circle"} size={12} color={isOnline ? "#4CAF50" : "#FF5252"} />
          <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={toggleOnlineStatus}
          trackColor={{ false: "#ddd", true: "#FF1493" }}
          thumbColor={isOnline ? "#fff" : "#fff"}
        />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF1493']} tintColor="#FF1493" />}
      >
       {currentRides.length == 0 && <StatsCard />}

        {currentRides.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 8 }]}>Active Bookings</Text>
            {currentRides.map((ride) => renderActiveRide(ride))}
          </>
        ) : isOnSpotCaptain ? (
          onSpotRequests.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 8 }]}>
                On-spot Available Bookings ({onSpotRequests.length})
              </Text>
              {onSpotRequests.map((b) => (
                <OnSpotRequestCard key={b.booking_no || b.id} booking={b} />
              ))}
            </>
          ) : (
            <View style={styles.waitingContainer}>
              <Animated.View style={styles.waitingContent}>
                <Icon name={'radio'} size={60} color={'#FF1493'} />
              </Animated.View>
            </View>
          )
        ) : !hasSpecialService && isOnline && rideRequest ? (
          <RideRequestCard />
        ) : (
          <View style={styles.waitingContainer}>
            <Animated.View style={styles.waitingContent}>
              <Icon 
                name={hasSpecialService ? "users" : (isOnline ? "radio" : "wifi-off")} 
                size={60} 
                color={hasSpecialService ? "#FF1493" : (isOnline ? "#FF1493" : "#ccc")} 
              />
            </Animated.View>
          </View>
        )}
      </ScrollView>

      {/* OTP Modal - For OnSpot start service */}
      <Modal visible={showOtpModal} animationType="slide" transparent onRequestClose={() => setShowOtpModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isOnSpotCaptain ? 'Start Service' : 'Start Ride'}
            </Text>
            <Text style={styles.modalSubtitle}>Enter OTP to verify and start</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter OTP"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              value={enteredOtp}
              onChangeText={setEnteredOtp}
              maxLength={6}
            />

            {/* For regular rides, show meter fields */}
            {!isOnSpotCaptain && !isDriverFlow && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Enter meter reading (km)"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={meterKmText}
                  onChangeText={setMeterKmText}
                />
                <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                  <Icon name="camera" size={20} color="#FF1493" />
                  <Text style={styles.imagePickerText}>{imageUri ? 'Change Meter Image' : 'Capture Meter Image'}</Text>
                </TouchableOpacity>
                {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : null}
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setShowOtpModal(false);
                  setEnteredOtp('');
                  setMeterKmText('');
                  setImageUri('');
                  setActiveRideForAction(null);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalBtn, styles.submitBtn]} 
                onPress={() => {
                  if (isOnSpotCaptain && activeRideForAction) {
                    handleOnSpotVerifyOtp(assigningBookingId);
                  } else {
                    submitStartRide();
                  }
                }} 
                disabled={isLoading}
              >
                {isLoading ? <ActivityIndicator color="#fff" size="small" /> : 
                  <Text style={styles.submitBtnText}>
                    {isOnSpotCaptain ? 'Verify & Start' : 'Start Ride'}
                  </Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Topup Modal */}
      <Modal visible={showTopupModal} animationType="slide" transparent onRequestClose={() => setShowTopupModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Topup</Text>
            <TextInput style={styles.input} placeholderTextColor={'#999'} placeholder="Extra Kilometers" keyboardType="numeric" value={extraKm} onChangeText={setExtraKm} />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Reason for topup"
              placeholderTextColor={'#999'}
              multiline
              numberOfLines={3}
              value={reason}
              onChangeText={setReason}
            />
            <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
              <Icon name="camera" size={20} color="#FF1493" />
              <Text style={styles.imagePickerText}>{imageUri ? 'Change Meter Image' : 'Capture Meter Image'}</Text>
            </TouchableOpacity>
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setShowTopupModal(false);
                  setExtraKm('');
                  setReason('');
                  setImageUri('');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalBtn, styles.submitBtn]} onPress={submitTopupRequest} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Request Topup</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Topup OTP Modal */}
      <Modal visible={showTopupOtpModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verify Topup</Text>
            <TextInput style={styles.input} placeholder="Enter OTP" placeholderTextColor={'#999'} value={topupOtp} onChangeText={setTopupOtp} keyboardType="number-pad" />
            <TouchableOpacity style={[styles.submitBtn, { padding: 10, borderRadius: 10 }]} onPress={handleVerifyTopup}>
              <Text style={styles.submitBtnText}>Verify</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* On-spot Reject Modal */}
      <Modal
        visible={showOnSpotRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOnSpotRejectModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject On-spot Booking</Text>
            <Text style={styles.modalSubtitle}>Enter reject reason</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter reject reason"
              value={onSpotRejectReason}
              onChangeText={setOnSpotRejectReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setShowOnSpotRejectModal(false);
                  setOnSpotRejectReason('');
                  setSelectedOnSpotBookingNo(null);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.submitBtn]}
                onPress={submitOnSpotReject}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete Ride Modal */}
      <Modal
        visible={showCompleteRideModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCompleteRideModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Ride</Text>
            <Text style={styles.modalSubtitle}>{isDriverFlow ? 'Capture final ride details if required by your service' : 'Enter meter reading and capture image'}</Text>

            {!isDriverFlow && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Enter meter reading (km)"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={meterKmText}
                  onChangeText={setMeterKmText}
                />

                <TouchableOpacity
                  style={styles.imagePickerBtn}
                  onPress={() =>
                    Alert.alert('Select Image', 'Choose meter reading image from', [
                      { text: 'Camera', onPress: openCompleteRideCamera },
                      { text: 'Gallery', onPress: openCompleteRideGallery },
                      { text: 'Cancel', style: 'cancel' },
                    ])
                  }
                >
                  <Icon name="camera" size={20} color="#FF1493" />
                  <Text style={styles.imagePickerText}>
                    {completeRideImageUri ? 'Change Meter Image' : 'Capture Meter Image'}
                  </Text>
                </TouchableOpacity>

                {completeRideImageUri ? (
                  <Image source={{ uri: completeRideImageUri }} style={styles.previewImage} />
                ) : null}
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setShowCompleteRideModal(false);
                  setMeterKmText('');
                  setCompleteRideImageUri('');
                  setActiveRideForAction(null);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.submitBtn]}
                onPress={submitCompleteRide}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Complete Ride</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showCancelModal} transparent animationType="slide">
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Cancel Booking</Text>

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Enter cancellation reason"
        value={cancelReason}
        onChangeText={setCancelReason}
        multiline
      />

      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={[styles.modalBtn, styles.cancelBtn]}
          onPress={() => setShowCancelModal(false)}
        >
          <Text>Close</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalBtn, styles.submitBtn]}
          onPress={() => {
            if (!cancelReason.trim()) {
              Alert.alert('Error', 'Please enter cancellation reason');
              return;
            }

            setShowCancelModal(false);
            handleOnSpotCancel(
              selectedBookingNo,
              cancelReason.trim()
            );
          }}
        >
          <Text style={{color:'#fff'}}>Submit</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flex: 1, padding: 15 },

  specialTripActions: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 5,
  },
  specialTripTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#333',
    marginBottom: 12,
  },
  specialTripBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  specialTripBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  specialTripBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    margin: 15,
    marginBottom: 0,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  
  statsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, padding: 20, marginBottom: 15 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: '#e0e0e0', alignSelf: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },

  requestCard: { backgroundColor: '#fff', borderRadius: 15, padding: 20, marginBottom: 15 },
  activeRideCard: { backgroundColor: '#fff', borderRadius: 15, padding: 20, marginBottom: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },

  requestBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF1493', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  requestBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 6 },

  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  fareAmount: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50' },

  locationContainer: { marginBottom: 15 },
  locationEntryRow: { flexDirection: 'row', alignItems: 'flex-start' },
  dotCol: { alignItems: 'center', marginRight: 12, width: 12 },
  locationTextCol: { flex: 1, paddingBottom: 10 },

  locationLabel: { fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  pickupText: { fontSize: 14, color: '#333' },
  dropText: { fontSize: 14, color: '#333' },
  pickupDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50' },
  dropDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF5252' },
  locationLine: { width: 2, height: 30, backgroundColor: '#ddd', marginVertical: 4 },

  toCityText: { fontSize: 14, color: '#810a45', fontWeight: '600' },
  toCityDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#810a45', marginTop: 8 },

  rideInfo: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, gap: 15 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 16, color: '#666' },

  paymentInfo: {
    backgroundColor: '#FFF0F5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  tokenAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
  },
  balanceAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5722',
  },

  customerInfo: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 10, marginBottom: 15 },
  customerDetail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customerText: { fontSize: 14, color: '#666' },

  buttonRow: { flexDirection: 'row', gap: 12 },
  acceptBtn: { flex: 1, backgroundColor: '#4CAF50', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  rejectBtn: { flex: 1, backgroundColor: '#FF5252', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  cancelRideBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FF5252', borderRadius: 12, paddingVertical: 11, marginTop: 10, gap: 8 },
  cancelRideBtnText: { color: '#FF5252', fontSize: 15, fontWeight: '600' },

  waitingContainer: { backgroundColor: '#fff', borderRadius: 15, padding: 30, alignItems: 'center', marginBottom: 15 },
  waitingContent: { alignItems: 'center' },
  waitingCard: { alignItems: 'center', padding: 20 },
  waitingTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 10 },
  waitingText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },

  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: '#f9f9f9', color: '#000' },
  textArea: { height: 80, textAlignVertical: 'top' },
  imagePickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FF1493', borderRadius: 12, padding: 12, marginBottom: 15, gap: 8 },
  imagePickerText: { color: '#FF1493', fontSize: 14, fontWeight: '500' },
  previewImage: { width: '100%', height: 150, borderRadius: 12, marginBottom: 15 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#f0f0f0' },
  submitBtn: { backgroundColor: '#FF1493' },
  cancelBtnText: { color: '#666', fontSize: 16, fontWeight: '500' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '500' },
});

export default DriverHomeFlow;