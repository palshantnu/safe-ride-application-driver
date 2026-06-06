import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  RefreshControl,
  FlatList,
  Dimensions,
  Animated,
  ActivityIndicator,
  Image,
  StatusBar,
  TextInput,
  Modal,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { NativeModules } from 'react-native';
const { SoundHelper } = NativeModules;
import LocationService from '../../services/LocationService';
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
  BA_ACCEPT_BOOKING,
  BA_ASSIGN_DRIVER,
  BA_GET_DRIVER_LIST,
  BA_GET_CURRENT_BOOKING,
  GET_BA_BOOKING_HISTORY,
  REJECT_BOOKING,
} from '../../redux/actions/action-creator';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [isOnline, setIsOnline] = useState(false);
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

  // BA state
  const [baPendingBookings, setBaPendingBookings] = useState([]);
  const [bsActiveBookings, setBsActiveBookings] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningBookingId, setAssigningBookingId] = useState(null);
  const [baDrivers, setBaDrivers] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const { userData } = useSelector((state) => state.auth);
  console.log('userData', userData);

  const [driverStats, setDriverStats] = useState({
    todayRides: 0,
    todayEarnings: 0,
    rating: 4.8,
    totalRides: 0
  });


  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (userData?.ba_name) {
        await Promise.all([fetchBABookings(), fetchCurrentRide()]);
      } else {
        await Promise.all([fetchCurrentRide(), fetchBookingRequests()]);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const driveronlineStatus = useSelector((state) => state?.auth?.driveronlineStatus);
  const loginToken = useSelector((state) => state?.auth?.loginToken);

  useEffect(() => {
    if (loginToken) {
      LocationService.saveToken(loginToken);
    }
  }, [loginToken]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const prevRideRequestIdRef = useRef(null);
  const prevBAPendingCountRef = useRef(0);

  const dispatch = useDispatch();

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

  // Play ring when BA gets new pending bookings
  useEffect(() => {
    if (baPendingBookings.length > 0 && baPendingBookings.length > prevBAPendingCountRef.current) {
      SoundHelper?.playNotificationSound();
    } else if (baPendingBookings.length === 0) {
      SoundHelper?.stopNotificationSound();
    }
    prevBAPendingCountRef.current = baPendingBookings.length;
  }, [baPendingBookings]);

  // Stop sound when component unmounts
  useEffect(() => {
    return () => SoundHelper?.stopNotificationSound();
  }, []);

  // Fetch current ride if any
  const fetchCurrentRide = async () => {
    try {
      const action = userData?.ba_name ? BA_GET_CURRENT_BOOKING : GET_CURRENT_BOOKING;
      const res = await dispatch(action());
      console.log('Current ride response:', res);

      if (res?.status && res?.data) {
        if (userData?.ba_name) {
          const bookings = Array.isArray(res.data) ? res.data : [res.data];
          setBsActiveBookings(bookings);
        } else {
          const bookings = Array.isArray(res.data) ? res.data : [res.data];
          setCurrentRides(bookings);
          setRideRequest(null);
        }
      } else {
        if (userData?.ba_name) {
          setBsActiveBookings([]);
        } else {
          setCurrentRides([]);
        }
      }
    } catch (error) {
      console.log('Error fetching current ride:', error);
    }
  };
  // Fetch new booking requests
  const fetchBookingRequests = async () => {
    try {
      const res = await dispatch(GET_BOOKING_REQUESTS());
      console.log('Booking requests:', res);

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
            phone: booking.user_mobile || 'N/A'
          }
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
        } else {
          fetchBookingRequests();
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isOnline, currentRides.length]);

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

  const handleAccept = async () => {
    SoundHelper?.stopNotificationSound();
    try {
      setIsLoading(true);
      const res = await dispatch(ACCEPT_BOOKING({
        booking_id: rideRequest?.booking_id,
      }));

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
      console.log('error', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    SoundHelper?.stopNotificationSound();
    Alert.alert(
      'Reject Ride',
      'Are you sure you want to reject this ride request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            const res = await dispatch(REJECT_BOOKING({
              role: userData?.ba_name ? "business_associate" : "driver",
              booking_id: rideRequest?.booking_id,
            }));
            console.log('res----->', res);

            if (res?.status) {
              Alert.alert('Success', 'Ride rejected successfully');
              await fetchCurrentRide();
              setRideRequest(null);
            } else {
              Alert.alert('Error', res?.message || 'Failed to reject ride');
            }
            setRideRequest(null);
            Alert.alert('Ride Rejected', 'The ride request has been rejected');
          }
        }
      ]
    );
  };

  const toggleOnlineStatus = (value) => {
    if (value) {
      Alert.alert(
        'Go Online',
        'You will start receiving ride requests.',
        [
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
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Go Offline',
        'You will stop receiving ride requests.',
        [
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
            }
          }
        ]
      );
    }
  };

  const handleVerifyTopup = async () => {
    if (!topupOtp) {
      Alert.alert('Error', 'Enter OTP');
      return;
    }

    setIsLoading(true);
    try {
      const res = await dispatch(VERIFY_TOPUP({
        topup_id: selectedTopupId,
        otp: topupOtp
      }));
      console.log('res', res);

      if (res?.status) {
        Alert.alert('Success', 'Topup Verified');
        setShowTopupOtpModal(false);
        setTopupOtp('');
        fetchCurrentRide();
      } else {
        Alert.alert('Error', res?.message);
      }
    } catch (e) {
      console.log('e---->', e);

      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const permissions = [PermissionsAndroid.PERMISSIONS.CAMERA];
      if (Platform.Version >= 33) {
        permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
      } else {
        permissions.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
      }
      const results = await PermissionsAndroid.requestMultiple(permissions);
      return Object.values(results).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
    } catch {
      return false;
    }
  };

  const pickImage = () => {
    Alert.alert(
      'Select Image',
      'Choose image from',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Gallery', onPress: openGallery },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openCamera = async () => {
    const granted = await requestCameraPermission();
    if (!granted) {
      Alert.alert('Permission Denied', 'Camera permission is required to capture images.');
      return;
    }
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 800,
      maxWidth: 600,
      quality: 0.8,
    };

    launchCamera(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        console.log('Camera Error: ', response.errorMessage);
        Alert.alert('Error', 'Failed to open camera');
      } else if (response.assets && response.assets[0]) {
        setImageUri(response.assets[0].uri);
      }
    });
  };

  const openGallery = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 800,
      maxWidth: 600,
      quality: 0.8,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled gallery');
      } else if (response.error) {
        console.log('Gallery Error: ', response.error);
        Alert.alert('Error', 'Failed to open gallery');
      } else if (response.assets && response.assets[0]) {
        setImageUri(response.assets[0].uri);
      }
    });
  };

  const handleArrived = async (bookingId) => {
    Alert.alert(
      'Arrived at Pickup',
      'Have you arrived at the pickup location?',
      [
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
            } catch (error) {
              Alert.alert('Error', 'Something went wrong');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const isDriverServiceRide = (booking) =>
    String(booking?.service_name || '').includes('Driver');

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
      if (!meterKmText.trim()) {
        Alert.alert('Error', 'Please enter the meter reading (km)');
        return;
      }
      if (!imageUri) {
        Alert.alert('Error', 'Please capture meter image');
        return;
      }
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
    } catch (error) {
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
    if (!extraKm) {
      Alert.alert('Error', 'Please enter extra kilometers');
      return;
    }
    if (!reason) {
      Alert.alert('Error', 'Please enter reason for topup');
      return;
    }
    if (!imageUri) {
      Alert.alert('Error', 'Please capture meter image');
      return;
    }

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
    } catch (error) {
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
    if (!granted) {
      Alert.alert('Permission Denied', 'Camera permission is required to capture images.');
      return;
    }
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 800,
      maxWidth: 600,
      quality: 0.8,
    };

    launchCamera(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.errorCode) {
        console.log('Camera Error: ', response.errorMessage);
        Alert.alert('Error', 'Failed to open camera');
      } else if (response.assets && response.assets[0]) {
        setCompleteRideImageUri(response.assets[0].uri);
      }
    });
  };

  const openCompleteRideGallery = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 800,
      maxWidth: 600,
      quality: 0.8,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled gallery');
      } else if (response.error) {
        console.log('Gallery Error: ', response.error);
        Alert.alert('Error', 'Failed to open gallery');
      } else if (response.assets && response.assets[0]) {
        setCompleteRideImageUri(response.assets[0].uri);
      }
    });
  };

  const submitCompleteRide = async () => {
    const shouldUseMeterFields = !isDriverServiceRide(activeRideForAction);

    if (shouldUseMeterFields) {
      if (!completeRideImageUri) {
        Alert.alert('Error', 'Please capture the meter reading image');
        return;
      }
      if (!meterKmText.trim()) {
        Alert.alert('Error', 'Please enter the meter reading (km)');
        return;
      }
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
    } catch (error) {
      console.log('Error completing ride:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };
  const handleCancelRide = (bookingId) => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const res = await dispatch(CANCEL_BOOKING({
                role: 'DRIVER',
                booking_id: bookingId,
                cancel_reason: 'Cancelled by driver',
              }));
              if (res?.status) {
                Alert.alert('Cancelled', 'Ride has been cancelled');
                await fetchCurrentRide();
              } else {
                Alert.alert('Error', res?.message || 'Failed to cancel ride');
              }
            } catch (e) {
              Alert.alert('Error', 'Something went wrong');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      'ACCEPTED': '#4CAF50',
      'TOKEN_PAID': '#FFC107',
      'ARRIVED': '#00BCD4',
      'STARTED': '#FF5722',
      'TOPUP_PENDING': '#FF9800',
      'BALANCE_PAID': '#4CAF50',
      'COMPLETED': '#9E9E9E',
      'CANCELLED': '#F44336'
    };
    return colors[status] || '#757575';
  };

  const getStatusText = (status) => {
    const texts = {
      'ACCEPTED': 'Ride Accepted',
      'TOKEN_PAID': 'Token Paid',
      'ARRIVED': 'Driver Arrived',
      'STARTED': 'Ride Started',
      'TOPUP_PENDING': 'Topup Pending',
      'BALANCE_PAID': 'Balance Paid',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled'
    };
    return texts[status] || status;
  };

  const renderActiveRide = (booking) => {
    if (!booking) return null;

    const bookingId = booking.booking_id;
    const pickupLocation = booking.pickup_address || booking.pickup_city;
    const dropLocation = booking.drop_address || booking.drop_city;
    const status = booking.status;
    const latestTopup = booking.topups?.length
      ? booking.topups[booking.topups.length - 1]
      : null;

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
            onPress={() => navigation.navigate('InCityMap', {
              booking_id: bookingId,
              bookingData: booking,
            })}
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
              {booking.service_name?.includes('Rental') && booking.to_city ? <View style={styles.locationLine} /> : null}
              {booking.service_name?.includes('Driver') && booking.to_city ? <View style={styles.locationLine} /> : null}
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
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => handleArrived(bookingId)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="navigation" size={20} color="#fff" />
                <Text style={styles.btnText}>Arrived at Pickup</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {status === 'BALANCE_PAID' && (
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => handleStartRide(booking)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
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

        {(status === 'SEARCHING' || status === 'ASSIGN' || status === 'TOKEN_PAID' || status === 'ARRIVED' || status === 'ACCEPTED') &&
          (<TouchableOpacity
            style={styles.cancelRideBtn}
            onPress={() => handleCancelRide(bookingId)}
            disabled={isLoading}
          >
            <Icon name="x-circle" size={18} color="#FF5252" />
            <Text style={styles.cancelRideBtnText}>Cancel Ride</Text>
          </TouchableOpacity>)}

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
    <Animated.View
      style={[
        styles.requestCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
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
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={handleReject}
          disabled={isLoading}
        >
          <Icon name="x" size={20} color="#fff" />
          <Text style={styles.btnText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={handleAccept}
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

  const StatsCard = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Icon name="calendar" size={24} color="#FF1493" />
        <Text style={styles.statValue}>{driverStats.todayRides}</Text>
        <Text style={styles.statLabel}>Today's Rides</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Icon name="rupee" size={24} color="#4CAF50" />
        <Text style={styles.statValue}>₹{driverStats.todayEarnings}</Text>
        <Text style={styles.statLabel}>Today's Earnings</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Icon name="star" size={24} color="#FFD700" />
        <Text style={styles.statValue}>{driverStats.rating}</Text>
        <Text style={styles.statLabel}>Rating</Text>
      </View>
    </View>
  );

  useEffect(() => {
    if (driveronlineStatus?.is_online !== undefined) {
      const online = driveronlineStatus.is_online === 1;
      setIsOnline(online);
      if (online) {
        LocationService.start();
      } else {
        LocationService.stop();
      }
    }
  }, [driveronlineStatus]);

  useEffect(() => {
    fetchOnlineStatus();
  }, []);

  const fetchOnlineStatus = async () => {
    await dispatch(GET_ONLINE_STATUS());
  };

  // ── BA functions ──────────────────────────────────────────
  const fetchBABookings = async () => {
    try {
      const res = await dispatch(GET_BA_BOOKING_HISTORY());
      if (res?.status && Array.isArray(res.data)) {
        const searching = res.data.filter(b => b.status === 'SEARCHING');
        setBaPendingBookings(searching);
      } else {
        setBaPendingBookings([]);
      }
    } catch (e) {
      console.log('fetchBABookings error:', e);
    }
  };

  const loadBADrivers = async () => {
    try {
      const res = await dispatch(BA_GET_DRIVER_LIST());
      if (res?.status && res?.data) {
        setBaDrivers(Array.isArray(res.data) ? res.data : []);
      }
    } catch (e) {
      console.log('loadBADrivers error:', e);
    }
  };

  const handleBAAccept = async (bookingId) => {
    setIsLoading(true);
    try {
      const res = await dispatch(BA_ACCEPT_BOOKING({ booking_id: bookingId }));
      if (res?.status) {
        Alert.alert('Success', 'Booking accepted');
        fetchBABookings();
      } else {
        Alert.alert('Error', res?.message || 'Failed to accept booking');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBAAssignDriver = async (driverId) => {
    setIsAssigning(true);
    try {
      const res = await dispatch(BA_ASSIGN_DRIVER({
        booking_id: assigningBookingId,
        driver_id: driverId,
      }));
      if (res?.status) {
        Alert.alert('Success', 'Driver assigned successfully');
        setShowAssignModal(false);
        setAssigningBookingId(null);
        fetchBABookings();
      } else {
        Alert.alert('Error', res?.message || 'Failed to assign driver');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsAssigning(false);
    }
  };

  useEffect(() => {
    if (!userData?.ba_name) return;
    fetchBABookings();
    fetchCurrentRide();
    const interval = setInterval(() => {
      fetchBABookings();
      fetchCurrentRide();
    }, 5000);
    return () => clearInterval(interval);
  }, [userData?.ba_name]);

  const renderBABookingCard = (booking) => (
    <View key={booking.booking_id} style={styles.activeRideCard}>
      {console.log('booking--->', booking)
      }
      <View style={styles.cardHeader}>
        <View style={styles.requestBadge}>
          <Icon name="bell" size={16} color="#fff" />
          <Text style={styles.requestBadgeText}>New Booking</Text>
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
            <Text style={styles.pickupText}>{booking.pickup_address || booking.pickup_city}</Text>
          </View>
        </View>
        <View style={styles.locationEntryRow}>
          <View style={styles.dotCol}>
            <View style={styles.dropDot} />
            {booking.service_name?.includes('Rental') && booking.to_city ? <View style={styles.locationLine} /> : null}
          </View>
          <View style={styles.locationTextCol}>
            <Text style={styles.locationLabel}>Drop</Text>
            <Text style={styles.dropText}>{booking.drop_address || booking.drop_city}</Text>
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

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => {
            Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
              { text: 'No', style: 'cancel' },
              {
                text: 'Yes, Cancel',
                style: 'destructive',
                onPress: async () => {
                  const res = await dispatch(REJECT_BOOKING({
                    role: 'business_associate',
                    booking_id: booking.booking_id
                  }));
                  if (res?.status) {
                    fetchBABookings();
                  } else {
                    Alert.alert('Error', res?.message || 'Failed to cancel');
                  }
                },
              },
            ]);
          }}
          disabled={isLoading}
        >
          <Icon name="x" size={20} color="#fff" />
          <Text style={styles.btnText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => handleBAAccept(booking.booking_id)}
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
    </View>
  );
  const renderBAActiveBookingCard = (booking) => {
    const status = booking?.status;
    const driverstatus = booking?.driver_status;
    console.log('driverstatus', booking);

    const latestTopup = booking?.topups?.length
      ? booking.topups[booking.topups.length - 1]
      : null;
    const pickupLocation = booking?.pickup_address || booking?.pickup_city;
    const dropLocation = booking?.drop_address || booking?.drop_city;
    const bookingId = booking?.booking_id || booking?.id;

    const handleBAStartRide = () => {
      setAssigningBookingId(bookingId);
      setShowOtpModal(true);
    };

    const handleBACompleteRide = () => {
      Alert.alert('Complete Ride', 'Please capture the final meter reading image', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            Alert.alert('Select Image', 'Choose final meter reading image from', [
              {
                text: 'Camera',
                onPress: async () => {
                  const granted = await requestCameraPermission();
                  if (!granted) {
                    Alert.alert('Permission Denied', 'Camera permission is required.');
                    return;
                  }
                  launchCamera({ mediaType: 'photo', maxHeight: 800, maxWidth: 600, quality: 0.8 }, (response) => {
                    if (response.assets?.[0]) submitBACompleteRide(bookingId, response.assets[0].uri);
                  });
                },
              },
              {
                text: 'Gallery',
                onPress: () => {
                  launchImageLibrary({ mediaType: 'photo', maxHeight: 800, maxWidth: 600, quality: 0.8 }, (response) => {
                    if (response.assets?.[0]) submitBACompleteRide(bookingId, response.assets[0].uri);
                  });
                },
              },
              { text: 'Cancel', style: 'cancel' },
            ]);
          },
        },
      ]);
    };

    const submitBACompleteRide = async (bId, uri) => {
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append('booking_id', bId);
        formData.append('image', { uri, name: 'complete_ride_image.jpg', type: 'image/jpeg' });
        const res = await dispatch(COMPLETE_RIDE(formData));
        if (res?.status) {
          Alert.alert('Success', 'Ride completed successfully');
          await fetchCurrentRide();
        } else {
          Alert.alert('Error', res?.message || 'Failed to complete ride');
        }
      } catch (e) {
        Alert.alert('Error', 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };

    const handleBACancelRide = () => {
      Alert.alert('Cancel Ride', 'Are you sure you want to cancel this ride?', [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const res = await dispatch(CANCEL_BOOKING({
                role: 'BUSINESS_ASSOCIATE',
                booking_id: bookingId,
                cancel_reason: 'Cancelled by BA',
              }));
              if (res?.status) {
                Alert.alert('Cancelled', 'Ride has been cancelled');
                await fetchCurrentRide();
              } else {
                Alert.alert('Error', res?.message || 'Failed to cancel ride');
              }
            } catch (e) {
              Alert.alert('Error', 'Something went wrong');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]);
    };

    return (
      <View key={bookingId} style={styles.activeRideCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Text style={styles.statusBadgeText}>{driverstatus == 'REASSIGN' ? getStatusText(driverstatus) : getStatusText(status)}</Text>
          </View>
          <Text style={styles.fareAmount}>₹{booking?.plan_price}</Text>
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
              {booking?.service_name?.includes('Rental') && booking?.to_city ? <View style={styles.locationLine} /> : null}
            </View>
            <View style={styles.locationTextCol}>
              <Text style={styles.locationLabel}>Drop</Text>
              <Text style={styles.dropText}>{dropLocation}</Text>
            </View>
          </View>
          {booking?.service_name?.includes('Rental') && booking?.to_city ? (
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
            <Text style={styles.infoText}>{booking?.person} Passenger</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="clock" size={16} color="#666" />
            <Text style={styles.infoText}>{booking?.plan_hour} Hour</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="map-pin" size={16} color="#666" />
            <Text style={styles.infoText}>{booking?.plan_km} km</Text>
          </View>
        </View>

        <View style={styles.customerInfo}>
          <View style={styles.customerDetail}>
            <Icon name="phone" size={14} color="#999" />
            <Text style={styles.customerText}>{booking?.user_mobile}</Text>
          </View>
        </View>

        {status === 'TOKEN_PAID' && <TouchableOpacity
          style={[styles.acceptBtn, { backgroundColor: '#2196F3', marginBottom: 8 }]}
          onPress={async () => {
            setAssigningBookingId(bookingId);
            await loadBADrivers();
            setShowAssignModal(true);
          }}
          disabled={isLoading}
        >
          <Icon name="user-check" size={20} color="#fff" />
          <Text style={styles.btnText}>Assign Driver</Text>
        </TouchableOpacity>}

        {status === 'ASSIGN' && <TouchableOpacity
          style={[styles.acceptBtn, { backgroundColor: '#FF9800', marginBottom: 8 }]}
          onPress={async () => {
            setAssigningBookingId(bookingId);
            await loadBADrivers();
            setShowAssignModal(true);
          }}
          disabled={isLoading}
        >
          <Icon name="refresh-cw" size={20} color="#fff" />
          <Text style={styles.btnText}>Reassign Driver</Text>
        </TouchableOpacity>}

        {/* {(status === 'ARRIVED' || status === 'BALANCE_PAID') && (
          <TouchableOpacity style={styles.acceptBtn} onPress={handleBAStartRide} disabled={isLoading}>
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
            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: '#FF9800', flex: 1 }]}
              onPress={() => {
                setAssigningBookingId(bookingId);
                setShowTopupModal(true);
              }}
              disabled={isLoading}
            >
              <Icon name="plus-circle" size={20} color="#fff" />
              <Text style={styles.btnText}>Request Topup</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: '#4CAF50', flex: 1 }]}
              onPress={handleBACompleteRide}
              disabled={isLoading}
            >
              <Icon name="check-circle" size={20} color="#fff" />
              <Text style={styles.btnText}>Complete Ride</Text>
            </TouchableOpacity>
          </View>
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
        )} */}

        {/* {['ACCEPTED', 'TOKEN_PAID', 'ARRIVED', 'BALANCE_PAID'].includes(status) && (
          <TouchableOpacity style={styles.cancelRideBtn} onPress={handleBACancelRide} disabled={isLoading}>
            <Icon name="x-circle" size={18} color="#FF5252" />
            <Text style={styles.cancelRideBtnText}>Cancel Ride</Text>
          </TouchableOpacity>
        )} */}
      </View>
    );
  };
  // ─────────────────────────────────────────────────────────

  const isDriverFlow = isDriverServiceRide(activeRideForAction);
  console.log('isDriverFlow', activeRideForAction);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#ff7f50" />

      <LinearGradient
        colors={['#ff7f50', '#ff7f50', '#e20f7a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.driverName}>{userData?.full_name || userData?.ba_name || 'User'}</Text>
          </View>
          <View style={styles.headerRight}>
            {userData?.ba_name && (
              <>
                <TouchableOpacity
                  style={styles.headerIconBtn}
                  onPress={() => navigation.navigate('BADriverList')}
                >
                  <Icon name="users" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.headerIconBtn, styles.addDriverBtn]}
                  onPress={() => navigation.navigate('AddDriver')}
                >
                  <Icon name="user-plus" size={18} color="#fff" />
                  <Text style={styles.addDriverText}>Add Driver</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.notificationBtn}
            // onPress={()  => navigation.navigate('Notifications')}
            >
              <Icon name="bell" size={22} color="#fff" />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {!userData?.ba_name && (
          <View style={styles.statusCard}>
            <View style={styles.statusInfo}>
              <Icon
                name={isOnline ? "circle" : "circle"}
                size={12}
                color={isOnline ? "#4CAF50" : "#FF5252"}
              />
              <Text style={styles.statusText}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={toggleOnlineStatus}
              trackColor={{ false: "#ddd", true: "#FF1493" }}
              thumbColor={isOnline ? "#fff" : "#fff"}
            />
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FF1493']}
            tintColor="#FF1493"
          />
        }
      >
        <StatsCard />

        {userData?.ba_name ? (
          <>
            {baPendingBookings.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 8 }]}>New Requests</Text>
                {baPendingBookings.map(booking => renderBABookingCard(booking))}
              </>
            ) : bsActiveBookings.length === 0 ? (
              <View style={styles.waitingContainer}>
                <Animated.View style={styles.waitingContent}>
                  <Icon name="inbox" size={60} color="#ccc" />
                  <Text style={styles.waitingTitle}>No Pending Bookings</Text>
                  <Text style={styles.waitingText}>
                    New booking requests will appear here automatically.
                  </Text>
                </Animated.View>
              </View>
            ) : null}
            {bsActiveBookings.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 8 }]}>Active Bookings</Text>
                {bsActiveBookings.map(booking => renderBAActiveBookingCard(booking))}
              </>
            )}
          </>
        ) : currentRides.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 8 }]}>Active Bookings</Text>
            {currentRides.map(ride => renderActiveRide(ride))}
          </>
        ) : isOnline && rideRequest ? (
          <RideRequestCard />
        ) : (
          <View style={styles.waitingContainer}>
            <Animated.View style={styles.waitingContent}>
              <Icon
                name={isOnline ? "radio" : "wifi-off"}
                size={60}
                color={isOnline ? "#FF1493" : "#ccc"}
              />
              <Text style={styles.waitingTitle}>
                {isOnline ? 'Waiting for Ride Requests' : 'You are Offline'}
              </Text>
              <Text style={styles.waitingText}>
                {isOnline
                  ? 'Your location is active. You will receive ride requests shortly.'
                  : 'Please go online to start receiving ride requests and earn money.'}
              </Text>
            </Animated.View>
          </View>
        )}

        {/* <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Earnings')}
            >
              <Icon name="rupee" size={32} color="#FF1493" />
              <Text style={styles.actionText}>Earnings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('RideHistory')}
            >
              <Icon name="clock" size={32} color="#FF1493" />
              <Text style={styles.actionText}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Vehicles')}
            >
              <Icon name="truck" size={32} color="#FF1493" />
              <Text style={styles.actionText}>Vehicles</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Support')}
            >
              <Icon name="headphones" size={32} color="#FF1493" />
              <Text style={styles.actionText}>Support</Text>
            </TouchableOpacity>
          </View>
        </View> */}

        {/* <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today's Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Online Hours</Text>
              <Text style={styles.summaryValue}>4h 30m</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Completed Rides</Text>
              <Text style={styles.summaryValue}>{driverStats.todayRides}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Avg Fare/Ride</Text>
              <Text style={styles.summaryValue}>₹{driverStats.todayEarnings / (driverStats.todayRides || 1)}</Text>
            </View>
          </View>
        </View> */}
      </ScrollView>

      {/* OTP Modal */}
      <Modal
        visible={showOtpModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOtpModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Start Ride</Text>
            <Text style={styles.modalSubtitle}>{isDriverFlow ? 'Enter OTP to start this ride' : 'Enter OTP and capture meter reading'}</Text>

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

                <TouchableOpacity
                  style={styles.imagePickerBtn}
                  onPress={pickImage}
                >
                  <Icon name="camera" size={20} color="#FF1493" />
                  <Text style={styles.imagePickerText}>
                    {imageUri ? 'Change Meter Image' : 'Capture Meter Image'}
                  </Text>
                </TouchableOpacity>

                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.previewImage} />
                ) : null}
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
                onPress={submitStartRide}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Start Ride</Text>
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

      {/* Topup Modal */}
      <Modal
        visible={showTopupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTopupModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Topup</Text>

            <TextInput
              style={styles.input}
              placeholder="Extra Kilometers"
              placeholderTextColor="#000"
              keyboardType="numeric"
              value={extraKm}
              onChangeText={setExtraKm}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Reason for topup"
              placeholderTextColor="#000"
              multiline
              numberOfLines={3}
              value={reason}
              onChangeText={setReason}
            />

            <TouchableOpacity
              style={styles.imagePickerBtn}
              onPress={pickImage}
            >
              <Icon name="camera" size={20} color="#FF1493" />
              <Text style={styles.imagePickerText}>
                {imageUri ? 'Change Meter Image' : 'Capture Meter Image'}
              </Text>
            </TouchableOpacity>

            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : null}

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

              <TouchableOpacity
                style={[styles.modalBtn, styles.submitBtn]}
                onPress={submitTopupRequest}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Request Topup</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showTopupOtpModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verify Topup</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter OTP"
              placeholderTextColor="#000"
              value={topupOtp}
              onChangeText={setTopupOtp}
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={[styles.submitBtn, { padding: 10, borderRadius: 10, textAlign: 'center', justifyContent: 'center', alignItems: 'center' }]}
              onPress={handleVerifyTopup}
            >
              <Text style={styles.submitBtnText}>Verify</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal >

      {/* Assign Driver Modal */}
      <Modal
        visible={showAssignModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>Assign Driver</Text>
            <Text style={styles.modalSubtitle}>Select a driver for this booking</Text>
            <FlatList
              data={baDrivers}
              keyExtractor={(item, i) => item.id?.toString() || i.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.driverSelectItem}
                  onPress={() => handleBAAssignDriver(item.id)}
                  disabled={isAssigning}
                >
                  <View style={styles.driverSelectLeft}>
                    <View style={styles.driverSelectAvatar}>
                      <Icon name="user" size={20} color="#FF1493" />
                    </View>
                    <View>
                      <Text style={styles.driverSelectName}>{item.full_name || item.name}</Text>
                      <Text style={styles.driverSelectPhone}>{item.phone || item.mobile}</Text>
                    </View>
                  </View>
                  {isAssigning ? (
                    <ActivityIndicator size="small" color="#FF1493" />
                  ) : (
                    <Icon name="chevron-right" size={18} color="#ccc" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyDriverText}>No drivers available</Text>
              }
            />
            <TouchableOpacity
              style={[styles.modalBtn, styles.cancelBtn, { marginTop: 10 }]}
              onPress={() => setShowAssignModal(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  driverName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addDriverBtn: {
    flexDirection: 'row',
    width: 'auto',
    paddingHorizontal: 10,
    borderRadius: 18,
    gap: 5,
  },
  addDriverText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  notificationBtn: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF5252',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationCount: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginTop: 10,
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
  content: {
    flex: 1,
    padding: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  activeRideCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  requestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF1493',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  requestBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  fareAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  locationContainer: {
    marginBottom: 15,
  },
  locationEntryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dotCol: {
    alignItems: 'center',
    marginRight: 12,
    width: 12,
  },
  locationTextCol: {
    flex: 1,
    paddingBottom: 10,
  },
  locationIcon: {
    alignItems: 'center',
    marginRight: 15,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  dropDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF5252',
  },
  locationLine: {
    width: 2,
    height: 30,
    backgroundColor: '#ddd',
    marginVertical: 4,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationRow: {
    marginBottom: 15,
  },
  locationLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  pickupText: {
    fontSize: 14,
    color: '#333',
  },
  dropText: {
    fontSize: 14,
    color: '#333',
  },
  toCityText: {
    fontSize: 14,
    color: '#810a45',
    fontWeight: '600',
  },
  toCityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#810a45',
    marginTop: 8,
  },
  rideInfo: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 15,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  customerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  customerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerText: {
    fontSize: 14,
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#FF5252',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  waitingContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    marginBottom: 15,
  },
  waitingCard: {
    alignItems: 'center',
    padding: 20,
  },
  waitingContent: {
    alignItems: 'center',
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  waitingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  quickActions: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 50) / 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF1493',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  imagePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF1493',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    gap: 8,
  },
  imagePickerText: {
    color: '#FF1493',
    fontSize: 14,
    fontWeight: '500',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f0f0f0',
  },
  submitBtn: {
    backgroundColor: '#FF1493',
  },
  cancelBtnText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  driverSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  driverSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverSelectAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff0f8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF1493',
  },
  driverSelectName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  driverSelectPhone: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  emptyDriverText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
    fontSize: 14,
  },
  cancelRideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FF5252',
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 10,
    gap: 8,
  },
  cancelRideBtnText: {
    color: '#FF5252',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default HomeScreen;
