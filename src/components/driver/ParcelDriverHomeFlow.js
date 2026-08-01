// ParcelDriverHomeFlow.js - Complete with current-delivery API

import React, { useEffect, useRef, useState } from 'react';
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
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');
import Icon from 'react-native-vector-icons/Feather';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useDispatch, useSelector } from 'react-redux';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import {
  GET_ONLINE_STATUS,
  UPDATE_ONLINE_STATUS,
} from '../../redux/actions/action-creator';
import LocationService from '../../services/LocationService';


const { NativeModules } = require('react-native');
const { SoundHelper } = NativeModules;

// API endpoints for parcel
const PARCEL_API = {
  GET_AVAILABLE: 'https://sigiride.com/api/parcel/driver/available',
  GET_HISTORY: 'https://sigiride.com/api/parcel/driver/my-deliveries',
  GET_CURRENT: 'https://sigiride.com/api/parcel/driver/current-delivery',
  ACCEPT: 'https://sigiride.com/api/parcel/driver/accept',
  ARRIVE: 'https://sigiride.com/api/parcel/driver/arrive',
  PICKUP_OTP: 'https://sigiride.com/api/parcel/driver/pickup-otp',
  DELIVERY_OTP: 'https://sigiride.com/api/parcel/driver/delivery-otp',
  CANCEL: 'https://sigiride.com/api/parcel/driver/cancel',
    REJECT: 'https://sigiride.com/api/parcel/reject',

};



const getStatusColor = (driverStatus) => {
  const status = driverStatus?.toLowerCase();
  const map = {
    accepted: '#4CAF50',
    arrived: '#00BCD4',
    picked_up: '#2196F3',
    delivered: '#9E9E9E',
    cancelled: '#F44336',
  };
  return map[status] || '#FF9800';
};

const getStatusText = (driverStatus) => {
  const status = driverStatus?.toLowerCase();
  console.log('Determining status text for:', driverStatus);
  const map = {
    accepted: 'Accepted',
    arrived: 'Arrived at Pickup',
    picked_up: 'Picked Up',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    token_paid: 'Token Paid',
  };
  return map[status] || 'Pending';
};
const BRAND   = '#E91E8C';
const BLUE    = '#1565C0';
const GREEN   = '#2E7D32';
const GREEN_L = '#43A047';
const RED     = '#D32F2F';
const AMBER   = '#F57F17';
const SURFACE = '#FFFFFF';
const BG      = '#F7F8FA';
const TEXT    = '#111827';
const SUBTLE  = '#6B7280';
const BORDER  = '#E5E7EB';

const ParcelDriverHomeFlow = ({ navigation }) => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.auth);
  const driveronlineStatus = useSelector((state) => state?.auth?.driveronlineStatus);
  const loginToken = useSelector((state) => state?.auth?.loginToken);

  const [isOnline, setIsOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] =
  useState(false);

const [selectedParcelId, setSelectedParcelId] =
  useState(null);

const [rejectReason, setRejectReason] =
  useState('');
  // Parcel state
  const [availableParcels, setAvailableParcels] = useState([]);
  const [currentDeliveries, setCurrentDeliveries] = useState([]);
  const [parcelHistory, setParcelHistory] = useState([]);
  
  // Modal states
  const [showPickupOtpModal, setShowPickupOtpModal] = useState(false);
  const [showDeliveryOtpModal, setShowDeliveryOtpModal] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [pickupImage, setPickupImage] = useState('');
  const [deliveryImage, setDeliveryImage] = useState('');
  const [activeParcelId, setActiveParcelId] = useState(null);
  
  // Cancel states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelParcelId, setCancelParcelId] = useState(null);
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const prevCountRef = useRef(0);
const prevParcelCountRef = useRef(0);

  const animateRequest = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  };

  // Format parcel data from API response
  const formatParcelData = (parcel, isCurrent = false) => ({
    id: parcel.id,
    parcel_booking_id: parcel.parcel_booking_id,
    pickup_address: parcel.pickup_address,
    pickup_city: parcel.pickup_city,
    pickup_date: parcel.pickup_date,
    pickup_time: parcel.pickup_time,
    pickup_landmark: parcel.pickup_landmark,
    delivery_address: parcel.drop_address,
    delivery_city: parcel.drop_city,
    delivery_landmark: parcel.drop_landmark,
    customer_name: parcel.user_name || `Customer ${parcel.user_id}`,
    customer_phone: parcel.user_mobile || 'Not provided',
    receiver_name: parcel.receiver_name,
    receiver_phone: parcel.receiver_mobile,
    parcel_weight: parcel.approx_weight,
    parcel_value: parcel.amount,
    delivery_charge: parcel.amount,
    token_amount: parcel.token_amount,
    balance_amount: parcel.balance_amount,
    driver_status: parcel.driver_status,
    packaging_material: parcel.packaging_material_type,
    loading_unloading: parcel.loading_unloading,
    remarks: parcel.remarks,
    plan_name: parcel.plan_name,
    pickup_otp: parcel.pickup_otp,
    delivery_otp: parcel.delivery_otp,
    pickup_otp_verified: parcel.pickup_otp_verified,
    delivery_otp_verified: parcel.delivery_otp_verified,
    user_status: parcel.user_status,
    paid: parcel.paid,
    _raw: parcel,
     total_fare: parcel.total_fare,
          driver_amount:parcel.driver_amount
  });

  // Fetch current deliveries (driver_status: ACCEPTED, ARRIVED, PICKED_UP)
  const fetchCurrentDeliveries = async () => {
    if (!isOnline) return;
    try {
      const response = await axios.get(PARCEL_API.GET_CURRENT, {
        headers: { Authorization: `Bearer ${loginToken}` },
      });
      console.log('Current deliveries:', response.data);
      
      if (response.data?.status && response.data?.data && response.data.data.length > 0) {
        const formatted = response.data.data.map(p => formatParcelData(p, true));
        setCurrentDeliveries(formatted);
        // Animate if new deliveries came
        if (formatted.length > prevCountRef.current) {
          animateRequest();
        }
        prevCountRef.current = formatted.length;
        setAvailableParcels([]);
      } else {
        setCurrentDeliveries([]);
        prevCountRef.current = 0;
      }
    } catch (error) {
      console.log('Error fetching current deliveries:', error);
      setCurrentDeliveries([]);
    }
  };

  // Fetch available parcels (pending, not assigned to any driver)
  const fetchAvailableParcels = async () => {
    if (!isOnline) return;
    if (currentDeliveries.length > 0) return; // Don't fetch if has active deliveries
    
    try {
      const response = await axios.get(PARCEL_API.GET_AVAILABLE, {
        headers: { Authorization: `Bearer ${loginToken}` },
      });
      console.log('Available parcels:', response.data);
      
      if (response.data?.status && response.data?.data && response.data.data.length > 0) {
        const pendingParcels = response.data.data.filter(p => p.driver_id === null && p.status === 'pending');
        if (pendingParcels.length > 0) {
          const formatted = pendingParcels.map(p => formatParcelData(p, false));
          setAvailableParcels(formatted);
         if (formatted.length > 0) {
  animateRequest();

  if (formatted.length > prevParcelCountRef.current) {
    SoundHelper?.playNotificationSound();
  }
}

prevParcelCountRef.current = formatted.length;
        } else {
          setAvailableParcels([]);
        }
      } else {
        setAvailableParcels([]);
      }
    } catch (error) {
      console.log('Error fetching available parcels:', error);
    }
  };

  const fetchParcelHistory = async () => {
    if (!loginToken) return;
    try {
      const response = await axios.get(PARCEL_API.GET_HISTORY, {
        headers: { Authorization: `Bearer ${loginToken}` },
        params: { page: 1, limit: 10 },
      });

      if (response?.data?.status && Array.isArray(response?.data?.data)) {
        setParcelHistory(response.data.data);
      } else {
        setParcelHistory([]);
      }
    } catch (error) {
      console.log('Error fetching parcel history:', error);
      setParcelHistory([]);
    }
  };

  // Combined refresh
  const refreshData = async () => {
    await fetchCurrentDeliveries();
    if (currentDeliveries.length === 0) {
      await fetchAvailableParcels();
    }
    await fetchParcelHistory();
  };

  // Polling
  useEffect(() => {
    let interval;
    if (isOnline) {
      refreshData();
      interval = setInterval(refreshData, 5000);
    }
    return () => clearInterval(interval);
  }, [isOnline, currentDeliveries.length]);

  // Sync online status from Redux
  useEffect(() => {
    if (driveronlineStatus?.is_online !== undefined) {
      const online = driveronlineStatus.is_online === 1;
      setIsOnline(online);
      if (online) {
        LocationService.start();
        refreshData();
      } else {
        LocationService.stop();
        setCurrentDeliveries([]);
        setAvailableParcels([]);
      }
    }
  }, [driveronlineStatus]);

  const fetchOnlineStatus = async () => {
    await dispatch(GET_ONLINE_STATUS());
  };

  useEffect(() => {
    fetchOnlineStatus();
    fetchParcelHistory();
  }, []);

  useEffect(() => {
    if (loginToken) {
      LocationService.saveToken(loginToken);
    }
  }, [loginToken]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  // Request permissions
  const requestCameraPermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    {
                        title: 'Camera Permission',
                        message: 'App needs access to your camera to take profile photo',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.log('Camera permission error:', err);
                return false;
            }
        }
        return true;
    };

  const pickImage = async (setImageFn) => {
    Alert.alert('Select Image', 'Choose image from', [
      { text: 'Camera', onPress: () => openCamera(setImageFn) },
      { text: 'Gallery', onPress: () => openGallery(setImageFn) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openCamera = async (setImageFn) => {
    const granted = await requestCameraPermission();
    if (!granted) {
      Alert.alert('Permission Denied', 'Camera permission required.');
      return;
    }
    launchCamera(
      { mediaType: 'photo', includeBase64: false, maxHeight: 800, maxWidth: 600, quality: 0.8 },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Error', 'Failed to open camera');
          return;
        }
        if (response.assets?.[0]) setImageFn(response.assets[0].uri);
      }
    );
  };

  const openGallery = async (setImageFn) => {
    launchImageLibrary(
      { mediaType: 'photo', includeBase64: false, maxHeight: 800, maxWidth: 600, quality: 0.8 },
      (response) => {
        if (response.didCancel) return;
        if (response.error) {
          Alert.alert('Error', 'Failed to open gallery');
          return;
        }
        if (response.assets?.[0]) setImageFn(response.assets[0].uri);
      }
    );
  };

  // Accept parcel
  const handleAccept = async (parcel) => {
    setIsLoading(true);
    SoundHelper?.stopNotificationSound();
    try {
      const response = await axios.post(
        PARCEL_API.ACCEPT,
        { parcel_booking_id: parcel.parcel_booking_id },
        { headers: { Authorization: `Bearer ${loginToken}` } }
      );
      if (response.data?.status) {
        Alert.alert('Success', 'Parcel accepted');
        await refreshData();
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to accept');
      }
    } catch (error) {
      console.log('Error accepting parcel:', error.response?.data);
      Alert.alert('Error', error.response?.data.message || error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

useEffect(() => {
  return () => {
    SoundHelper?.stopNotificationSound();
  };
}, []);
useEffect(() => {
  if (availableParcels.length > 0) {
    SoundHelper?.playNotificationSound();
  } else {
    SoundHelper?.stopNotificationSound();
  }
}, [availableParcels.length]);

useEffect(() => {
  return () => SoundHelper?.stopNotificationSound();
}, []);
  const handleReject = (parcel) => {
    SoundHelper?.stopNotificationSound();

    Alert.alert('Reject Parcel', 'Reject this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => setAvailableParcels(prev => prev.filter(p => p.id !== parcel.id)),
      },
    ]);
  };

  // Arrive at pickup
  const handleArrive = async (parcelId) => {
    Alert.alert('Arrived at Pickup', 'Mark as arrived?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Arrived',
        onPress: async () => {
          setIsLoading(true);
          try {
            const response = await axios.post(
              PARCEL_API.ARRIVE,
              { parcel_booking_id: parcelId },
              { headers: { Authorization: `Bearer ${loginToken}` } }
            );
            console.log('response', response.data);
            
            if (response.data?.status) {
              Alert.alert('Success', 'Marked as arrived');
              await refreshData();
            } else {
              Alert.alert('Error', response.data?.message || 'Failed');
            }
          } catch(error) {
            Alert.alert('Error',error.response?.data.message || error.message ||'Something went wrong'); }
          finally { setIsLoading(false); }
        },
      },
    ]);
  };

  // Pickup OTP
  const handlePickupOTP = (parcelId) => {
    setActiveParcelId(parcelId);
    setShowPickupOtpModal(true);
  };

  const submitPickupOTP = async () => {
    if (!enteredOtp) return Alert.alert('Error', 'Enter OTP');
    if (!pickupImage) return Alert.alert('Error', 'Capture pickup image');
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('parcel_booking_id', activeParcelId);
      formData.append('otp', enteredOtp);
      formData.append('pickup_image', {
        uri: pickupImage,
        name: 'pickup_image.jpg',
        type: 'image/jpeg',
      });
      const response = await axios.post(PARCEL_API.PICKUP_OTP, formData, {
        headers: { Authorization: `Bearer ${loginToken}`, 'Content-Type': 'multipart/form-data' },
      });
      if (response.data?.status) {
        Alert.alert('Success', 'Parcel picked up');
        setShowPickupOtpModal(false);
        setEnteredOtp('');
        setPickupImage('');
        setActiveParcelId(null);
        await refreshData();
      } else {
        Alert.alert('Error', response.data?.message || 'OTP verification failed');
      }
    } catch (error) { Alert.alert('Error', 'Something went wrong'); }
    finally { setIsLoading(false); }
  };

  // Delivery OTP
  const handleDeliveryOTP = (parcelId) => {
    setActiveParcelId(parcelId);
    setShowDeliveryOtpModal(true);
  };

  const submitDeliveryOTP = async () => {
    if (!enteredOtp) return Alert.alert('Error', 'Enter OTP');
    if (!deliveryImage) return Alert.alert('Error', 'Capture delivery image');
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('parcel_booking_id', activeParcelId);
      formData.append('otp', enteredOtp);
      formData.append('delivery_image', {
        uri: deliveryImage,
        name: 'delivery_image.jpg',
        type: 'image/jpeg',
      });
      const response = await axios.post(PARCEL_API.DELIVERY_OTP, formData, {
        headers: { Authorization: `Bearer ${loginToken}`, 'Content-Type': 'multipart/form-data' },
      });
      if (response.data?.status) {
        Alert.alert('Success', 'Parcel delivered!');
        setShowDeliveryOtpModal(false);
        setEnteredOtp('');
        setDeliveryImage('');
        setActiveParcelId(null);
        await refreshData();
      } else {
        Alert.alert('Error', response.data?.message || 'OTP verification failed');
      }
    } catch (error) { Alert.alert('Error', 'Something went wrong'); }
    finally { setIsLoading(false); }
  };

  // Cancel
  const handleCancel = (parcelId) => {
    setCancelParcelId(parcelId);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const submitCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Error', 'Please enter cancel reason');
      return;
    }
    setShowCancelModal(false);
    try {
      setIsLoading(true);
      const response = await axios.post(
        PARCEL_API.CANCEL,
        { parcel_booking_id: cancelParcelId, cancel_reason: cancelReason.trim() },
        { headers: { Authorization: `Bearer ${loginToken}` } }
      );
      if (response.data?.status) {
        Alert.alert('Cancelled', 'Delivery cancelled');
        fetchCurrentDeliveries();
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to cancel');
      }
    } catch (error) {
      console.log('Error cancelling parcel:', error);
      Alert.alert('Error', 'Failed to cancel delivery');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle online status
  const toggleOnlineStatus = (value) => {
    if (value) {
      Alert.alert('Go Online', 'Start receiving parcel requests?', [
        { text: 'Cancel', onPress: () => setIsOnline(false) },
        {
          text: 'Go Online',
          onPress: async () => {
            try {
              setIsLoading(true);
              await dispatch(UPDATE_ONLINE_STATUS({ is_online: 1 }));
              LocationService.start();
              setIsOnline(true);
              await refreshData();
            } catch (error) { Alert.alert('Error', 'Failed to go online'); }
            finally { setIsLoading(false); }
          },
        },
      ]);
    } else {
      Alert.alert('Go Offline', 'Stop receiving parcel requests?', [
        { text: 'Cancel', onPress: () => setIsOnline(true) },
        {
          text: 'Go Offline',
          onPress: async () => {
            try {
              setIsLoading(true);
              await dispatch(UPDATE_ONLINE_STATUS({ is_online: 0 }));
              LocationService.stop();
              setIsOnline(false);
              setCurrentDeliveries([]);
              setAvailableParcels([]);
            } catch { Alert.alert('Error', 'Failed to go offline'); }
            finally { setIsLoading(false); }
          },
        },
      ]);
    }
  };
  const formatPickupDateTime = (dateValue, timeValue) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';

    const formattedDate = date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    if (!timeValue) return formattedDate;

    const [hours, minutes] = timeValue.toString().split(':');
    const time = new Date();
    time.setHours(parseInt(hours, 10));
    time.setMinutes(parseInt(minutes, 10));
    if (Number.isNaN(time.getTime())) return formattedDate;

    return `${formattedDate} • ${time.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`;
  };


  // Render delivery card (for active deliveries)
  const renderDeliveryCard = (delivery) => {
    const status = delivery.driver_status?.toLowerCase() || 'pending';
    const parcelId = delivery.parcel_booking_id;
console.log('Rendering delivery card:', delivery);
 const pickupDateTime = formatPickupDateTime(delivery?.pickup_date, delivery?.pickup_time);
    return (
      <View key={delivery.id} style={styles.activeCard}>
        <View style={styles.cardHeader}>
        <View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(delivery.status),width: '100%',justifyContent:'center',alignItems:'center' }]}>
            <Text style={styles.statusBadgeText}>{(delivery.driver_status === 'ACCEPTED' && delivery.paid === 1 )?getStatusText('token_paid'):getStatusText(delivery.driver_status)}</Text>
           </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor('picked_up'),marginTop:10 }]}>
            <Text style={styles.statusBadgeText}>ID: {delivery.parcel_booking_id}</Text>
           </View>
          </View>
          
              <View>
        <Text style={styles.fareAmount}>₹{delivery.driver_amount}{'\n'}<Text style={{fontSize:12}}>Captain amount</Text></Text>
                 <Text style={{...styles.fareAmount, color: 'red',fontSize:12}}>  ₹{delivery.total_fare}{'\n'} <Text style={{fontSize:12}}>Service amount</Text></Text>
     </View>
        </View>
{/* <View style={[styles.statusBadge ]}>
             <Text style={{...styles.statusBadgeText,color:'black',fontSize:16}}>USER STATUS : {getStatusText(delivery.user_status)}</Text>
          </View> */}
           {(status === 'accepted' && delivery?.user_status === 'TOKEN_PAID') && (
          <TouchableOpacity style={styles.arriveBtn} onPress={() => handleArrive(parcelId)} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <><Icon name="navigation" size={20} color="#fff" /><Text style={styles.btnText}>Arrived at Pickup</Text></>}
          </TouchableOpacity>
        )}
            {status === 'arrived' && (
          <TouchableOpacity style={styles.pickupBtn} onPress={() => handlePickupOTP(parcelId)} disabled={isLoading}>
            <Icon name="package" size={20} color="#fff" /><Text style={styles.btnText}>Pickup Parcel (OTP)</Text>
          </TouchableOpacity>
        )}
        {status === 'picked_up' && (
          <TouchableOpacity style={styles.deliveryBtn} onPress={() => handleDeliveryOTP(parcelId)} disabled={isLoading}>
            <Icon name="check-circle" size={20} color="#fff" /><Text style={styles.btnText}>Complete Delivery (OTP)</Text>
          </TouchableOpacity>
        )}
        {status === 'delivered' && (
          <View style={styles.completedCard}><Icon name="check-circle" size={40} color="#4CAF50" /><Text style={styles.completedTitle}>Delivery Completed</Text></View>
        )}
         {delivery.paid == 1 && <>
              {delivery.receiver_phone && delivery.pickup_otp_verified == 1? (
                <View style={styles.driverCard}>
                  <View style={styles.driverRow}>
                    <View style={styles.driverAvatar}>
                      <FontAwesome5 name="user-circle" size={36} color="#FF1493" />
                    </View>
                    <View style={styles.driverMeta}>
                      <Text style={styles.driverName}>{delivery.receiver_name || 'Receiver'}</Text>
                      {delivery.receiver_phone ? (
                        <TouchableOpacity style={styles.callRow} onPress={() => Linking.openURL(`tel:${delivery.receiver_phone}`)}>
                          <Icon name="phone" size={14} color="#4CAF50" />
                          <Text style={styles.driverPhone}>{delivery.receiver_phone}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    {delivery.receiver_phone ? (
                      <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${delivery.receiver_phone}`)}>
                        <Icon name="phone-call" size={20} color="#fff" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ) : (<View style={styles.driverCard}>
                  <View style={styles.driverRow}>
                    <View style={styles.driverAvatar}>
                      <FontAwesome5 name="user-circle" size={36} color="#FF1493" />
                    </View>
                    <View style={styles.driverMeta}>
                      <Text style={styles.driverName}>{delivery.customer_name || 'Receiver'}</Text>
                      {delivery.customer_phone ? (
                        <TouchableOpacity style={styles.callRow} onPress={() => Linking.openURL(`tel:${delivery.customer_phone}`)}>
                          <Icon name="phone" size={14} color="#4CAF50" />
                          <Text style={styles.driverPhone}>{delivery.customer_phone}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    {delivery.customer_phone ? (
                      <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${delivery.customer_phone}`)}>
                        <Icon name="phone-call" size={20} color="#fff" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ) }
              </>}
        <View style={styles.currentDetailsGrid}>
         
          
          <View style={styles.currentDetailItem}>
            <FontAwesome5 name="weight-hanging" size={13} color="#666" />
            <View style={styles.currentDetailTextWrap}>
              <Text style={styles.currentDetailLabel}>Weight</Text>
              <Text style={styles.currentDetailValue}>
                {delivery.parcel_weight ? `${delivery.parcel_weight} kg` : '-'}
              </Text>
            </View>
          </View>

          {/* <View style={styles.currentDetailItem}>
            <Icon name="dollar-sign" size={15} color="#666" />
            <View style={styles.currentDetailTextWrap}>
              <Text style={styles.currentDetailLabel}>Value</Text>
              <Text style={styles.currentDetailValue}>
                {delivery.parcel_value ? `₹${delivery.parcel_value}` : '-'}
              </Text>
            </View>
          </View> */}

          <View style={styles.currentDetailItem}>
            <FontAwesome5 name="people-carry" size={13} color="#666" />
            <View style={styles.currentDetailTextWrap}>
              <Text style={styles.currentDetailLabel}>Loading/Unloading</Text>
              <Text style={styles.currentDetailValue}>{delivery.loading_unloading || '-'}</Text>
            </View>
          </View>

          <View style={styles.currentDetailItem}>
            <Icon name="archive" size={15} color="#666" />
            <View style={styles.currentDetailTextWrap}>
              <Text style={styles.currentDetailLabel}>Packaging</Text>
              <Text style={styles.currentDetailValue}>{delivery.packaging_material || '-'}</Text>
            </View>
          </View>

          <View style={{...styles.currentDetailItem}}>
            <Icon name="message-square" size={15} color="#666" />
            <View style={styles.currentDetailTextWrap}>
              <Text numberOfLines={1} style={styles.currentDetailLabel}>Remarks</Text>
              <Text style={styles.currentDetailValue}>{delivery.remarks || '-'}</Text>
            </View>
          </View>
        </View>
     {pickupDateTime ? (
          <View style={styles.scheduleDateRow}>
            <Icon name="calendar" size={14} color="#FF1493" />
            <Text style={styles.scheduleDateText}>{pickupDateTime}</Text>
          </View>
        ) : null}
        <View style={styles.locationContainer}>
          <View style={styles.locationEntryRow}>
            <View style={styles.dotCol}><View style={styles.pickupDot} /><View style={styles.locationLine} /></View>
            <View style={styles.locationTextCol}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.pickupText}>{delivery.pickup_address}, {delivery.pickup_city}</Text>
              {delivery.pickup_landmark ? <Text style={styles.contactText}>📍 {delivery.pickup_landmark}</Text> : null}
              {/* <Text style={styles.contactText}>📅 {new Date(delivery.pickup_date).toLocaleDateString()} at {delivery.pickup_time}</Text> */}
              <Text style={styles.contactText}>👤 {delivery.customer_name}</Text>
            </View>
          </View>
          <View style={styles.locationEntryRow}>
            <View style={styles.dotCol}><View style={styles.dropDot} /></View>
            <View style={styles.locationTextCol}>
              <Text style={styles.locationLabel}>Delivery</Text>
              <Text style={styles.dropText}>{delivery.delivery_address}, {delivery.delivery_city}</Text>
              {delivery.delivery_landmark ? <Text style={styles.contactText}>📍 {delivery.delivery_landmark}</Text> : null}
              <Text style={styles.contactText}>👤 Receiver: {delivery.receiver_name}</Text>
              {/* <Text style={styles.contactText}>📞 {delivery.receiver_phone}</Text> */}
            
             
            </View>
          </View>
        </View>

        {/* {delivery.remarks ? (
          <View style={styles.remarksContainer}><Icon name="message-circle" size={14} color="#999" /><Text style={styles.remarksText}>Note: {delivery.remarks}</Text></View>
        ) : null} */}

       
    
        {!['delivered', 'cancelled'].includes(status) && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(parcelId)} disabled={isLoading}>
            <Icon name="x-circle" size={18} color="#FF5252" /><Text style={styles.cancelBtnText}>Cancel Delivery</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
const submitParcelReject = async (parcelId, reason = 'cancel') => {
  if (!parcelId) return;

  try {
    setIsLoading(true);
    const response = await axios.post(
      PARCEL_API.REJECT,
      {
        parcel_booking_id: parcelId,
        reject_reason: reason,
      },
      {
        headers: {
          Authorization: `Bearer ${loginToken}`,
        },
      },
    );
    console.log('Reject response:', response.data);
    if (response.data?.status) {
      Alert.alert(
        'Success',
        'Parcel rejected successfully',
      );
      fetchAvailableParcels();
    } else {
      Alert.alert(
        'Error',
        response.data?.message || 'Failed to reject parcel',
      );
    }
  } catch (error) {
    console.log('Error rejecting parcel:', error);
    Alert.alert('Error', 'Failed to reject parcel');
  } finally {
    setIsLoading(false);
  }
};

  const ParcelRequestCard = ({ parcel }) => (
    <Animated.View style={[styles.requestCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.cardHeader}>
        <View>
        <View style={styles.requestBadge}><Icon name="bell" size={16} color="#fff" /><Text style={styles.requestBadgeText}>New Parcel Request</Text></View>
        <View style={{...styles.requestBadge,marginTop:10,backgroundColor:'green'}}><Text style={styles.requestBadgeText}>ID: {parcel.parcel_booking_id}</Text></View>
        </View>
         <View>
        <Text style={styles.fareAmount}>₹{parcel.driver_amount}{'\n'}<Text style={{fontSize:12}}>Captain amount</Text></Text>
                 <Text style={{...styles.fareAmount, color: 'red',fontSize:12}}>  ₹{parcel.total_fare}{'\n'} <Text style={{fontSize:12}}>Service amount</Text></Text>
     </View> </View>
      <View style={styles.currentDetailsGrid}>
        {/* <View style={styles.currentDetailItem}>
          <Icon name="package" size={15} color="#666" />
          <View style={styles.currentDetailTextWrap}>
            <Text style={styles.currentDetailLabel}>Parcel ID</Text>
            <Text style={styles.currentDetailValue}>{parcel.parcel_booking_id || '-'}</Text>
          </View>
        </View> */}
        
        <View style={styles.currentDetailItem}>
          <FontAwesome5 name="weight-hanging" size={13} color="#666" />
          <View style={styles.currentDetailTextWrap}>
            <Text style={styles.currentDetailLabel}>Weight</Text>
            <Text style={styles.currentDetailValue}>
              {parcel.parcel_weight ? `${parcel.parcel_weight} kg` : '-'}
            </Text>
          </View>
        </View>

        {/* <View style={styles.currentDetailItem}>
         
          <View style={styles.currentDetailTextWrap}>
            <Text style={styles.currentDetailLabel}>₹ Value</Text>
            <Text style={styles.currentDetailValue}>
              {parcel.parcel_value ? `₹${parcel.parcel_value}` : '-'}
            </Text>
          </View>
        </View> */}

        <View style={styles.currentDetailItem}>
          <FontAwesome5 name="people-carry" size={13} color="#666" />
          <View style={styles.currentDetailTextWrap}>
            <Text style={styles.currentDetailLabel}>Loading/Unloading</Text>
            <Text style={styles.currentDetailValue}>{parcel.loading_unloading || '-'}</Text>
          </View>
        </View>

        <View style={styles.currentDetailItem}>
          <Icon name="archive" size={15} color="#666" />
          <View style={styles.currentDetailTextWrap}>
            <Text style={styles.currentDetailLabel}>Packaging</Text>
            <Text style={styles.currentDetailValue}>{parcel.packaging_material || '-'}</Text>
          </View>
        </View>

        <View style={styles.currentDetailItem}>
          <Icon name="message-square" size={15} color="#666" />
          <View style={styles.currentDetailTextWrap}>
            <Text numberOfLines={1} style={styles.currentDetailLabel}>Remarks</Text>
            <Text style={styles.currentDetailValue}>{parcel.remarks || '-'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.locationContainer}>
        <View style={styles.locationEntryRow}>
          <View style={styles.dotCol}><View style={styles.pickupDot} /><View style={styles.locationLine} /></View>
          <View style={styles.locationTextCol}>
            <Text style={styles.locationLabel}>Pickup</Text>
            <Text style={styles.pickupText}>{parcel.pickup_address}, {parcel.pickup_city}</Text>
            <Text style={{...styles.contactText,fontSize:15}}>📅 {new Date(parcel.pickup_date).toLocaleDateString()}</Text>
          </View>
        </View>
        <View style={styles.locationEntryRow}>
          <View style={styles.dotCol}><View style={styles.dropDot} /></View>
          <View style={styles.locationTextCol}>
            <Text style={styles.locationLabel}>Delivery</Text>
            <Text style={styles.dropText}>{parcel.delivery_address}, {parcel.delivery_city}</Text>
            <Text style={styles.contactText}>👤 {parcel.receiver_name}</Text>
          </View>
        </View>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => {
          submitParcelReject(parcel.parcel_booking_id, 'cancel');
        }} disabled={isLoading}>
          <Icon name="x" size={20} color="#fff" /><Text style={styles.btnText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(parcel)} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <><Icon name="check" size={20} color="#fff" /><Text style={styles.btnText}>Accept</Text></>}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
  const StatsCard = () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    const todaysDeliveries = (parcelHistory || []).filter((delivery) => {
      const bookingDate = delivery?.pickup_date || delivery?.created_at || delivery?.updated_at;
      if (!bookingDate) return false;
      return bookingDate.split('T')[0] === todayString;
    });

    const todaysEarnings = todaysDeliveries.reduce((sum, delivery) => {
      const price = Number(delivery?.driver_amount || delivery?.amount || delivery?.total_fare || 0);
      return sum + (Number.isFinite(price) ? price : 0);
    }, 0);

    const averageRating = 4.5;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Icon name="calendar" size={24} color="#FF1493" />
          <Text style={styles.statValue}>{todaysDeliveries.length}</Text>
          <Text style={styles.statLabel}>Today's Rides</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Icon name="rupee" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>₹{todaysEarnings}</Text>
          <Text style={styles.statLabel}>Today's Earnings</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Icon name="star" size={24} color="#FFD700" />
          <Text style={styles.statValue}>{averageRating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>
    );
  };


  return (
    <View style={styles.outer}>
      <View style={styles.parcelBanner}>
        <Icon name="package" size={16} color="#FF9800" />
        <Text style={styles.parcelBannerText}>Parcel Delivery Mode</Text>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusInfo}>
          <Icon name={isOnline ? "circle" : "circle"} size={12} color={isOnline ? "#4CAF50" : "#FF5252"} />
          <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
        <Switch value={isOnline} onValueChange={toggleOnlineStatus} trackColor={{ false: "#ddd", true: "#FF9800" }} thumbColor={isOnline ? "#fff" : "#fff"} />
      </View>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF9800']} tintColor="#FF9800" />}>
       

        {currentDeliveries.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Active Deliveries ({currentDeliveries.length})</Text>
            {currentDeliveries.map(d => renderDeliveryCard(d))}
          </>
        ) : isOnline && availableParcels.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>New Parcel Requests ({availableParcels.length})</Text>
            {availableParcels.map(p => <ParcelRequestCard key={p.id} parcel={p} />)}
          </>
        ) : (
          <>
           <StatsCard />
          <View style={styles.waitingContainer}>
            <Icon name={isOnline ? "truck" : "wifi-off"} size={60} color={isOnline ? "#FF9800" : "#ccc"} />
            <Text style={styles.waitingTitle}>{isOnline ? 'Waiting for Parcel Requests' : 'You are Offline'}</Text>
            <Text style={styles.waitingText}>{isOnline ? 'Your location is active. You will receive parcel delivery requests shortly.' : 'Please go online to start receiving parcel requests.'}</Text>
          </View>
          </>
        )}
         {parcelHistory.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 8 }]}>Recent Deliveries</Text>
            {parcelHistory.slice(0, 2).map((delivery) => (
              <TouchableOpacity
                key={delivery.id || delivery.parcel_booking_id}
                style={styles.recentBookingCard}
                onPress={() => navigation.navigate('ParcelDeliveryDetail', { delivery: {
                  ...delivery,
                  id: delivery.id,
                  booking_id: delivery.parcel_booking_id,
                  pickup: delivery.pickup_address || delivery.pickup_city,
                  delivery_address: delivery.drop_address || delivery.drop_city,
                  amount: delivery.amount || delivery.driver_amount || 0,
                  created_at: delivery.created_at,
                  status: delivery.driver_status?.toLowerCase() || delivery.status?.toLowerCase(),
                  customerName: delivery.user_name || 'Customer',
                  customerPhone: delivery.user_mobile,
                  earnings: delivery.driver_amount || 0,
                }})}
              >
                <View style={styles.recentBookingHeader}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(delivery.driver_status || delivery.status) }]} />
                  <Text style={styles.recentBookingStatus}>{getStatusText(delivery.driver_status || delivery.status)}</Text>
                  <Text style={styles.recentBookingFare}>₹{delivery.driver_amount || delivery.amount || 0}</Text>
                </View>
                <View style={styles.recentBookingLocRow}>
                  <Icon name="map-pin" size={12} color="#4CAF50" />
                  <Text style={styles.recentBookingLocText} numberOfLines={1}>{delivery.pickup_address || delivery.pickup_city}</Text>
                </View>
                <View style={styles.recentBookingLocRow}>
                  <Icon name="flag" size={12} color="#FF5252" />
                  <Text style={styles.recentBookingLocText} numberOfLines={1}>{delivery.drop_address || delivery.drop_city}</Text>
                </View>
                <View style={styles.recentBookingFooter}>
                  <Text style={styles.recentBookingService}>Parcel Delivery</Text>
                  <Text style={styles.recentBookingDate}>
                    {delivery.pickup_date ? new Date(delivery.pickup_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate('History')}
            >
              <Text style={styles.viewAllBtnText}>View All Bookings</Text>
              <Icon name="chevron-right" size={18} color="#FF1493" />
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>

      {/* Pickup OTP Modal */}
      <Modal visible={showPickupOtpModal} transparent animationType="slide" onRequestClose={() => setShowPickupOtpModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pickup Parcel</Text>
            <TextInput style={styles.input} placeholder="Enter OTP" keyboardType="number-pad" value={enteredOtp} onChangeText={setEnteredOtp} maxLength={6} placeholderTextColor="#000" />
            <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage(setPickupImage)}>
              <Icon name="camera" size={20} color="#FF9800" /><Text style={styles.imagePickerText}>{pickupImage ? 'Change Pickup Image' : 'Capture Pickup Image'}</Text>
            </TouchableOpacity>
            {pickupImage && <Image source={{ uri: pickupImage }} style={styles.previewImage} />}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => { setShowPickupOtpModal(false); setEnteredOtp(''); setPickupImage(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn,styles.cancelBtn, {backgroundColor: '#FF9800',borderColor:'#FF9800'}]} onPress={submitPickupOTP} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Verify & Pickup</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delivery OTP Modal */}
      <Modal visible={showDeliveryOtpModal} transparent animationType="slide" onRequestClose={() => setShowDeliveryOtpModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Delivery</Text>
            <TextInput style={styles.input} placeholder="Enter OTP" keyboardType="number-pad" value={enteredOtp} onChangeText={setEnteredOtp} maxLength={6} placeholderTextColor="#000"/>
            <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage(setDeliveryImage)}>
              <Icon name="camera" size={20} color="#FF9800" /><Text style={styles.imagePickerText}>{deliveryImage ? 'Change Delivery Image' : 'Capture Delivery Image'}</Text>
            </TouchableOpacity>
            {deliveryImage && <Image source={{ uri: deliveryImage }} style={styles.previewImage} />}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => { setShowDeliveryOtpModal(false); setEnteredOtp(''); setDeliveryImage(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn,styles.cancelBtn, {backgroundColor: '#FF9800',borderColor:'#FF9800'}]} onPress={submitDeliveryOTP} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Verify & Deliver</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
  visible={showRejectModal}
  transparent
  animationType="slide"
  onRequestClose={() =>
    setShowRejectModal(false)
  }>

  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>

      <Text style={styles.modalTitle}>
        Reject Parcel
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter reject reason"
        value={rejectReason}
        onChangeText={setRejectReason}
        multiline
      />

      <View style={styles.modalButtons}>

        <TouchableOpacity
          style={[
            styles.modalBtn,
            styles.cancelBtn,
          ]}
          onPress={() => {
            setShowRejectModal(false);
            setRejectReason('');
          }}>
          <Text style={styles.cancelBtnText}>
            Cancel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modalBtn,
            styles.submitBtn,
          ]}
          onPress={submitParcelReject}>
          <Text style={styles.submitBtnText}>
            Reject
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  </View>
</Modal>
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Delivery</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter cancel reason"
              placeholderTextColor="#999"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.submitBtn]}
                onPress={submitCancel}
              >
                <Text style={styles.submitBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Styles (same as before, keeping all existing styles)
const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#f5f5f5' },
  driverCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginTop: 10,
    marginBottom: 10,
  },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#FFF0F7', alignItems: 'center', justifyContent: 'center',
  },
  driverMeta: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: '700', color: '#222' },
  callRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  driverPhone: { fontSize: 13, color: '#4CAF50', fontWeight: '500' },
  callBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1, padding: 15 },
  parcelBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8F0', borderRadius: 12, padding: 12, margin: 15, marginBottom: 0, gap: 10, borderWidth: 1, borderColor: '#FF9800', borderStyle: 'dashed' },
  parcelBannerText: { flex: 1, fontSize: 12, color: '#FF9800', fontWeight: '500' },
  statusCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, padding: 15, margin: 15, marginBottom: 0 },
  statusInfo: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 8 },
  statsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, padding: 20, marginBottom: 15 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: '#e0e0e0', alignSelf: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12, marginTop: 8 },
  requestCard: { backgroundColor: '#fff', borderRadius: 15, padding: 20, marginBottom: 15 },
  activeCard: { backgroundColor: '#fff', borderRadius: 15, padding: 20, marginBottom: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  requestBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF9800', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  requestBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 6 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  fareAmount: { fontSize: 25, fontWeight: 'bold', color: '#4CAF50' },
  parcelInfo: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 10, marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { fontSize: 14, color: '#666' },
  currentDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  currentDetailItem: {
    width: (width - 80) / 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 10,
  },
  currentDetailTextWrap: {
    flex: 1,
  },
  currentDetailLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  currentDetailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  locationContainer: { marginBottom: 15 },
  locationEntryRow: { flexDirection: 'row', alignItems: 'flex-start' },
  dotCol: { alignItems: 'center', marginRight: 12, width: 12 },
  locationTextCol: { flex: 1, paddingBottom: 10 },
  locationLabel: { fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  pickupText: { fontSize: 14, color: '#333', fontWeight: '500' },
  dropText: { fontSize: 14, color: '#333', fontWeight: '500' },
  contactText: { fontSize: 12, color: '#666', marginTop: 2 },
  pickupDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50' },
  dropDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF5252' },
  locationLine: { width: 2, height: 30, backgroundColor: '#ddd', marginVertical: 4 },
  remarksContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8F0', padding: 10, borderRadius: 8, marginBottom: 15, gap: 8 },
  remarksText: { flex: 1, fontSize: 15, color: '#000' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  acceptBtn: { flex: 1, backgroundColor: '#4CAF50', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  rejectBtn: { flex: 1, backgroundColor: '#FF5252', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  arriveBtn: { flex: 1, backgroundColor: '#00BCD4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  pickupBtn: { flex: 1, backgroundColor: '#FF9800', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  deliveryBtn: { flex: 1, backgroundColor: '#4CAF50', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FF5252', borderRadius: 12, paddingVertical: 11, marginTop: 10, gap: 8 },
  cancelBtnText: { color: '#FF5252', fontSize: 15, fontWeight: '600' },
  waitingContainer: { backgroundColor: '#fff', borderRadius: 15, padding: 30, alignItems: 'center', marginBottom: 15 },
  waitingContent: { alignItems: 'center' },
  waitingTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 10 },
  waitingText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  completedCard: { alignItems: 'center', padding: 20 },
  completedTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10 },
  completedText: { fontSize: 14, color: '#666', marginTop: 5 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: '#f9f9f9' },
  imagePickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FF9800', borderRadius: 12, padding: 12, marginBottom: 15, gap: 8 },
  imagePickerText: { color: '#FF9800', fontSize: 14, fontWeight: '500' },
  previewImage: { width: '100%', height: 150, borderRadius: 12, marginBottom: 15 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
//   cancelBtn: { backgroundColor: '#f0f0f0' },
  submitBtn: { backgroundColor: '#FF9800' },
  cancelBtnText: { color: '#666', fontSize: 16, fontWeight: '500' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '500' },
      passengerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: BG, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 4, borderWidth: 1, borderColor: BORDER,
    marginTop:20
  },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FCE4EC',
    justifyContent: 'center', alignItems: 'center',
  },

  passengerPhone: { fontSize: 12, color: SUBTLE, marginTop: 1 },
  callChip: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FCE4EC',
    justifyContent: 'center', alignItems: 'center',
  },
    scheduleDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF0F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  scheduleDateText: {
    fontSize: 18,
    color: '#FF1493',
    fontWeight: '600',
  },
    // Recent Bookings Styles
  recentBookingCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  recentBookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recentBookingStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    flex: 1,
  },
  recentBookingFare: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  recentBookingLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  recentBookingLocText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  recentBookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  recentBookingService: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  recentBookingDate: {
    fontSize: 11,
    color: '#999',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 30,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FF1493',
    backgroundColor: '#FFF0F7',
    gap: 6,
  },
  viewAllBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF1493',
  },

});

export default ParcelDriverHomeFlow;