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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { useDispatch, useSelector } from 'react-redux';
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
};

const DriverHomeFlow = ({ navigation }) => {
  const dispatch = useDispatch();

  const { userData } = useSelector((state) => state.auth);
  const driveronlineStatus = useSelector((state) => state?.auth?.driveronlineStatus);
  const loginToken = useSelector((state) => state?.auth?.loginToken);

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

  // Stop sound on unmount
  useEffect(() => {
    return () => SoundHelper?.stopNotificationSound();
  }, []);

  const fetchCurrentRide = async () => {
    try {
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

  const fetchBookingRequests = async () => {
    // Special service drivers don't get auto requests
    if (hasSpecialService) return;
    
    try {
      const res = await dispatch(GET_BOOKING_REQUESTS());
      if (res?.status && res?.data?.length > 0 && currentRides.length === 0) {
        const booking = res.data[0];
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

      interval = setInterval(() => {
        if (currentRides.length > 0) {
          fetchCurrentRide();
        } else if (!hasSpecialService) {
          fetchBookingRequests();
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isOnline, currentRides.length, hasSpecialService]);

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
    // Special service drivers can't toggle online/offline?
    if (hasSpecialService) {
      Alert.alert('Info', 'You will receive bookings assigned by Business Associate automatically.');
      return;
    }
    
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

  const renderActiveRide = (booking) => {
    if (!booking) return null;

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
          <Text style={styles.fareAmount}>₹{booking.plan_price}</Text>
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

        <View style={styles.customerInfo}>
          <View style={styles.customerDetail}>
            <Icon name="phone" size={14} color="#999" />
            <Text style={styles.customerText}>{booking.user_mobile}</Text>
          </View>
        </View>

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
      <View style={styles.cardHeader}>
        <View style={styles.requestBadge}>
          <Icon name="bell" size={16} color="#fff" />
          <Text style={styles.requestBadgeText}>New Ride Request</Text>
        </View>
        <Text style={styles.fareAmount}>₹{rideRequest.fare}</Text>
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
      {/* Special Service Banner */}
      {hasSpecialService && (
        <View style={styles.specialServiceBanner}>
          <Icon name="info" size={16} color="#FF1493" />
          <Text style={styles.specialServiceText}>
            You are a {getSpecialServiceName()} driver. Bookings assigned by BA will appear here.
          </Text>
        </View>
      )}

      {/* Online Status Card - Only show for normal drivers */}
     
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
        <StatsCard />

        {currentRides.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 8 }]}>Active Bookings</Text>
            {currentRides.map((ride) => renderActiveRide(ride))}
          </>
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
              <Text style={styles.waitingTitle}>
                {hasSpecialService 
                  ? 'Waiting for Assigned Bookings' 
                  : (isOnline ? 'Waiting for Ride Requests' : 'You are Offline')}
              </Text>
              <Text style={styles.waitingText}>
                {hasSpecialService
                  ? 'Your profile is active. Bookings assigned by Business Associate will appear here.'
                  : (isOnline
                    ? 'Your location is active. You will receive ride requests shortly.'
                    : 'Please go online to start receiving ride requests and earn money.')}
              </Text>
            </Animated.View>
          </View>
        )}
      </ScrollView>

      {/* Modals - Same as before */}
      <Modal visible={showOtpModal} animationType="slide" transparent onRequestClose={() => setShowOtpModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Start Ride</Text>
            <Text style={styles.modalSubtitle}>Enter OTP</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter OTP"
              placeholderTextColor="#000"
              keyboardType="number-pad"
              value={enteredOtp}
              onChangeText={setEnteredOtp}
              maxLength={6}
            />

            {!isDriverFlow && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Enter meter reading (km)"
                  placeholderTextColor="#000"
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

              <TouchableOpacity style={[styles.modalBtn, styles.submitBtn]} onPress={submitStartRide} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Start Ride</Text>}
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
            <TextInput style={styles.input} placeholderTextColor={'#000'} placeholder="Extra Kilometers" keyboardType="numeric" value={extraKm} onChangeText={setExtraKm} />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Reason for topup"
              placeholderTextColor={'#000'}
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
            <TextInput style={styles.input} placeholder="Enter OTP" placeholderTextColor={'#000'} value={topupOtp} onChangeText={setTopupOtp} keyboardType="number-pad" />
            <TouchableOpacity style={[styles.submitBtn, { padding: 10, borderRadius: 10 }]} onPress={handleVerifyTopup}>
              <Text style={styles.submitBtnText}>Verify</Text>
            </TouchableOpacity>
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
              placeholderTextColor="#000"
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
    </View>
  );
};

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flex: 1, padding: 15 },
  
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
  
  specialServiceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F8',
    borderRadius: 12,
    padding: 12,
    margin: 15,
    marginBottom: 0,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FF1493',
    borderStyle: 'dashed',
  },
  specialServiceText: {
    flex: 1,
    fontSize: 12,
    color: '#FF1493',
    fontWeight: '500',
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

  rideInfo: { flexDirection: 'row', marginBottom: 12, gap: 15 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 14, color: '#666' },

  customerInfo: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 10, marginBottom: 15 },
  customerDetail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customerText: { fontSize: 14, color: '#666' },

  buttonRow: { flexDirection: 'row', gap: 12 },
  acceptBtn: { flex: 1, backgroundColor: '#4CAF50', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  rejectBtn: { flex: 1, backgroundColor: '#FF5252', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

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
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: '#f9f9f9' },
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