import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { GET_DRIVER_BOOKING_HISTORY, GET_BA_BOOKING_HISTORY } from '../../redux/actions/action-creator';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';

const PARCEL_HISTORY_API = 'https://sigiride.com/api/parcel/driver/my-deliveries';
const ONSPOT_HISTORY_API = 'https://sigiride.com/api/onspot/captain/mybooking';
const LIMIT = 10;

const DriverHistoryScreen = ({ navigation }) => {
  const [rideHistory, setRideHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalRides: 0,
    totalEarnings: 0,
    avgRating: 0,
  });

  const dispatch = useDispatch();
  const loginToken = useSelector((state) => state?.auth?.loginToken);
  const { userData } = useSelector((state) => state.auth);
  const isBA = !!userData?.ba_name;
  
  // Check if driver is parcel delivery driver
  const isParcelDriver = userData?.service_id === 75;
  // Check if driver is OnSpot captain
  const isOnSpotCaptain = userData?.service_id === 77;

  // Fetch OnSpot history with pagination
  const fetchOnSpotHistory = async (pageNum = 1, shouldAppend = false) => {
    if (!loginToken) return;
    
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const response = await axios.get(ONSPOT_HISTORY_API, {
        headers: {
          Authorization: `Bearer ${loginToken}`,
        },
        params: {
          page: pageNum,
          limit: LIMIT,
        },
      });
      
      console.log('OnSpot history response:', response.data);

      if (response.data?.status && Array.isArray(response.data?.data)) {
        const formattedHistory = response.data.data.map(booking => formatOnSpotData(booking));
        
        if (shouldAppend) {
          setRideHistory(prev => {
  const merged = [...prev, ...formattedHistory];

  const unique = merged.filter(
    (item, index, self) =>
      index === self.findIndex(t => t.id === item.id)
  );

  return unique;
});
        } else {
          setRideHistory(formattedHistory);
        }
        
        // Handle pagination
        if (response.data?.pagination) {
          setTotalCount(response.data.pagination.total);
          setTotalPages(response.data.pagination.total_pages);
          setHasMore(pageNum < response.data.pagination.total_pages);
        }
        
        // Calculate stats from all data (if pagination info available)
        if (!shouldAppend) {
          calculateOnSpotStats(formattedHistory);
        } else {
          // Recalculate stats with all data
          const allHistory = [...rideHistory, ...formattedHistory];
          calculateOnSpotStats(allHistory);
        }
      } else {
        if (!shouldAppend) {
          setRideHistory([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.log('Error fetching OnSpot history:', error);
    } finally {
      if (pageNum === 1) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  // Format OnSpot data
  const formatOnSpotData = (booking) => {
    const status = booking.status?.toLowerCase() || 'pending';
    const earnings = parseFloat(booking.total_amount) || 0;
    const tokenPaid = parseFloat(booking.token_amount) || 0;
    const balancePaid = parseFloat(booking.balance_amount) || 0;
    
    return {
      id: booking.id,
      booking_id: booking.booking_no,
      is_onspot: true,
      booking_no: booking.booking_no,
      city: booking.city,
      full_address: booking.full_address,
      landmark: booking.landmark,
      remarks: booking.remarks,
      schedule_datetime: booking.schedule_datetime,
      token_amount: tokenPaid,
      balance_amount: balancePaid,
      total_amount: earnings,
      token_paid: booking.token_paid,
      balance_paid: booking.balance_paid,
      payment_mode: booking.payment_mode,
      otp_verified: booking.otp_verified,
      status: status,
      cancelled_by: booking.cancelled_by,
      cancel_reason: booking.cancel_reason,
      completed_at: booking.completed_at,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      service_name: booking.service_name,
      plan_name: booking.plan_name,
      customerName: booking.user_name || 'Customer',
      customerPhone: booking.user_mobile,
      earnings: earnings,
      driver_id: booking.driver_id,
    };
  };

  // Calculate OnSpot stats
  const calculateOnSpotStats = (bookings) => {
    const completedBookings = bookings.filter(b => b.status === 'completed');
    const totalRides = completedBookings.length;
    const totalEarnings = completedBookings.reduce((sum, b) => sum + b.earnings, 0);
    const avgRating = 4.5;

    setStats({
      totalRides,
      totalEarnings,
      avgRating,
    });
  };

  // Fetch parcel delivery history with pagination
  const fetchParcelHistory = async (pageNum = 1, shouldAppend = false) => {
    if (!loginToken) return;
    
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const response = await axios.get(PARCEL_HISTORY_API, {
        headers: {
          Authorization: `Bearer ${loginToken}`,
        },
        params: {
          page: pageNum,
          limit: LIMIT,
        },
      });
      
      console.log('Parcel history response:', response.data);

      if (response.data?.status && response.data?.data) {
        const formattedHistory = response.data.data.map(delivery => formatParcelData(delivery));
        
        if (shouldAppend) {
          setRideHistory(prev => {
  const merged = [...prev, ...formattedHistory];

  const unique = merged.filter(
    (item, index, self) =>
      index === self.findIndex(t => t.id === item.id)
  );

  return unique;
});
        } else {
          setRideHistory(formattedHistory);
          // Calculate stats from all data (if pagination info available)
          if (response.data?.pagination) {
            setTotalCount(response.data.pagination.total);
            setHasMore(pageNum < response.data.pagination.total_pages);
          }
        }
        
        // Calculate stats from current data (for display)
        calculateParcelStats(formattedHistory);
      } else {
        if (!shouldAppend) {
          setRideHistory([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.log('Error fetching parcel history:', error);
    } finally {
      if (pageNum === 1) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  // Format parcel data
  const formatParcelData = (delivery) => {
    const status = delivery.driver_status?.toLowerCase() || delivery.status?.toLowerCase() || 'pending';
    const earnings = parseFloat(delivery.amount) || 0;
    
    return {
      id: delivery.id,
      booking_id: delivery.parcel_booking_id,
      is_parcel: true,
      pickup: delivery.pickup_address,
      pickup_city: delivery.pickup_city,
      pickup_landmark: delivery.pickup_landmark,
      pickup_date: delivery.pickup_date,
      pickup_time: delivery.pickup_time,
      delivery_address: delivery.drop_address,
      delivery_city: delivery.drop_city,
      delivery_landmark: delivery.drop_landmark,
      receiver_name: delivery.receiver_name,
      receiver_mobile: delivery.receiver_mobile,
      parcel_weight: delivery.approx_weight,
      packaging_material: delivery.packaging_material_type,
      loading_unloading: delivery.loading_unloading,
      remarks: delivery.remarks,
      amount: parseFloat(delivery.amount),
      token_amount: parseFloat(delivery.token_amount),
      balance_amount: parseFloat(delivery.balance_amount),
      status: status,
      customerName: delivery.user_name || 'Customer',
      customerPhone: delivery.user_mobile,
      earnings: earnings,
      created_at: delivery.created_at,
      updated_at: delivery.updated_at,
      pickup_image: delivery.pickup_image,
      delivery_image: delivery.delivery_image,
      pickup_otp_verified: delivery.pickup_otp_verified,
      delivery_otp_verified: delivery.delivery_otp_verified,
    };
  };

  // Calculate parcel stats from current page
  const calculateParcelStats = (deliveries) => {
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered');
    const totalRides = completedDeliveries.length;
    const totalEarnings = completedDeliveries.reduce((sum, d) => sum + d.earnings, 0);
    const avgRating = 4.5;

    setStats({
      totalRides,
      totalEarnings,
      avgRating,
    });
  };

  // Fetch booking history (regular rides) with pagination
  const fetchBookingHistory = async (pageNum = 1, shouldAppend = false) => {
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const getHistory = isBA ? GET_BA_BOOKING_HISTORY : GET_DRIVER_BOOKING_HISTORY;
      const res = await dispatch(getHistory(pageNum, LIMIT));
      console.log('Booking history response:', res);

      if (res?.status && res?.data) {
        const formattedHistory = res.data.map(booking => formatRideData(booking));
        
        if (shouldAppend) {
          setRideHistory(prev => {
  const merged = [...prev, ...formattedHistory];

  const unique = merged.filter(
    (item, index, self) =>
      index === self.findIndex(t => t.id === item.id)
  );

  return unique;
});
        } else {
          setRideHistory(formattedHistory);
        }
        
        if (res?.pagination) {
          setHasMore(pageNum < res.pagination.total_pages);
          setTotalCount(res.pagination.total);
        }
        
        calculateStats(formattedHistory);
      } else {
        if (!shouldAppend) {
          setRideHistory([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.log('Error fetching booking history:', error);
    } finally {
      if (pageNum === 1) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  const formatRideData = (booking) => {
    if (booking.is_incity) {
      const price = parseFloat(booking.final_fare) || parseFloat(booking.actual_fare) || parseFloat(booking.total_fare) || 0;
      return {
        id: booking.id,
        booking_id: booking.booking_id,
        is_incity: true,
        pickup: booking.pickup_address || booking.pickup_city,
        destination: booking.drop_address || booking.drop_city || booking.to_city,
        price,
        date: booking.created_at,
        status: booking.status?.toLowerCase() || 'completed',
        riderName: booking.user_name || 'Customer',
        userMobile: booking.user_mobile,
        rating: booking.rating || 0,
        earnings: price,
        distance: parseFloat(booking.actual_distance) || 0,
        person: booking.person,
        created_at: booking.created_at,
        topupAmount: 0,
        topups: [],
      };
    }

    const totalTopupAmount = booking.topups?.reduce((sum, topup) =>
      sum + parseFloat(topup.topup_amount), 0) || 0;
    const totalFare = parseFloat(booking.plan_price) + totalTopupAmount;
    const earnings = totalFare;
    const rating = booking.rating || 4.5;

    return {
      id: booking.id,
      booking_id: booking.booking_id,
      is_incity: false,
      pickup: booking.pickup_address || booking.pickup_city,
      destination: booking.drop_address || booking.drop_city,
      to_city: booking.to_city,
      service_name: booking.service_name,
      vehicle: {
        name: booking.plan_name,
        type: 'Standard',
      },
      price: totalFare,
      basePrice: parseFloat(booking.plan_price),
      topupAmount: totalTopupAmount,
      date: booking.schedule_date,
      status: booking.status?.toLowerCase() || 'completed',
      riderName: booking.user_name || 'Customer',
      userMobile: booking.user_mobile,
      rating,
      earnings,
      distance: booking.plan_km || 0,
      duration: booking.plan_hour || 0,
      meter_images: booking.meter_images || [],
      topups: booking.topups || [],
      person: booking.person,
      created_at: booking.created_at,
    };
  };

  const calculateStats = (rides) => {
    const completedRides = rides.filter(ride => ride.status === 'completed');
    const totalRides = completedRides.length;
    const totalEarnings = completedRides.reduce((sum, ride) => sum + ride.earnings, 0);
    const avgRating = completedRides.length > 0 
      ? (completedRides.reduce((sum, ride) => sum + ride.rating, 0) / completedRides.length)?.toFixed(1)
      : 0;

    setStats({
      totalRides,
      totalEarnings,
      avgRating,
    });
  };

  // Load more items when reaching end
  const loadMore = () => {
    if (!hasMore || isLoadingMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    if (isOnSpotCaptain) {
      fetchOnSpotHistory(nextPage, true);
    } else if (isParcelDriver) {
      fetchParcelHistory(nextPage, true);
    } else {
      fetchBookingHistory(nextPage, true);
    }
  };

  // Initial load
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setRideHistory([]);
    if (isOnSpotCaptain) {
      fetchOnSpotHistory(1, false);
    } else if (isParcelDriver) {
      fetchParcelHistory(1, false);
    } else {
      fetchBookingHistory(1, false);
    }
  }, [isOnSpotCaptain, isParcelDriver]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    if (isOnSpotCaptain) {
      await fetchOnSpotHistory(1, false);
    } else if (isParcelDriver) {
      await fetchParcelHistory(1, false);
    } else {
      await fetchBookingHistory(1, false);
    }
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    const statusMap = {
      'completed': '#4CAF50',
      'delivered': '#4CAF50',
      'accepted': '#2196F3',
      'arrived': '#00BCD4',
      'picked_up': '#FF9800',
      'pending': '#FF9800',
      'assigned': '#4CAF50',
      'token_paid': '#2196F3',
      'started': '#FF5722',
      'cancelled': '#FF5252',
    };
    return statusMap[status] || '#FF5252';
  };

  const getStatusIcon = (status) => {
    const iconMap = {
      'completed': 'checkmark-circle',
      'delivered': 'checkmark-circle',
      'accepted': 'time',
      'arrived': 'navigate',
      'picked_up': 'cube',
      'pending': 'time',
      'assigned': 'checkmark-circle',
      'token_paid': 'cash-outline',
      'started': 'car-sport',
      'cancelled': 'close-circle',
    };
    return iconMap[status] || 'close-circle';
  };

  const getStatusText = (status) => {
    const textMap = {
      'completed': 'Completed',
      'delivered': 'Delivered',
      'accepted': 'Accepted',
      'arrived': 'Arrived',
      'picked_up': 'Picked Up',
      'pending': 'Pending',
      'assigned': 'Assigned',
      'token_paid': 'Token Paid',
      'started': 'Started',
      'cancelled': 'Cancelled',
    };
    return textMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleItemPress = (item) => {
    if (item.is_onspot) {
      navigation.navigate('OnSpotBookingDetail', { booking: item });
    } else if (item.is_parcel) {
      navigation.navigate('ParcelDeliveryDetail', { delivery: item });
    } else {
      navigation.navigate('BookingHistoryDetail', { ride: item });
    }
  };

  // Render OnSpot Card
  const renderOnSpotCard = ({ item }) => {
    const status = item.status;
    const isCompleted = status === 'completed';
    const isCancelled = status === 'cancelled';
    
    return (
      <TouchableOpacity
        style={styles.rideCard}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.dateTimeContainer}>
            <Icon name="calendar-outline" size={14} color="#810a45" />
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
            <Icon name="time-outline" size={14} color="#810a45" style={styles.timeIcon} />
            <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
          </View>
          <View style={styles.badgeRow}>
            <View style={styles.onspotBadge}>
              <Icon name="flash-outline" size={10} color="#fff" />
              <Text style={styles.onspotBadgeText}>OnSpot</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
              <Icon name={getStatusIcon(status)} size={12} color="#fff" />
              <Text style={styles.statusText}>{getStatusText(status)}</Text>
            </View>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.customerInfo}>
          <Icon name="person-outline" size={16} color="#810a45" />
          <Text style={styles.customerName}>{item.customerName}</Text>
          {/* <Text style={styles.customerPhone}>• {item.customerPhone}</Text> */}
        </View>

        {/* Location */}
        <View style={styles.rideLocation}>
          <View style={styles.locationPoint}>
            <Icon name="location" size={16} color="#FF9800" />
          </View>
          <View style={styles.locationTextWrap}>
            <Text style={styles.locationLabel}>Service Address</Text>
            <Text style={styles.locationText} numberOfLines={2}>
              {item.full_address}
            </Text>
            {item.landmark && (
              <Text style={styles.landmarkText}>📍 {item.landmark}</Text>
            )}
            <Text style={styles.cityText}>🏙️ {item.city}</Text>
          </View>
        </View>

        {/* Schedule Date & Time */}
        <View style={styles.scheduleContainer}>
          <Icon name="calendar-outline" size={14} color="#666" />
          <Text style={styles.scheduleText}>
            Schedule: {formatDateTime(item.schedule_datetime)}
          </Text>
        </View>

        {/* Price Breakdown */}
        <View style={styles.priceContainer}>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Total</Text>
            <Text style={styles.totalPrice}>₹{item.total_amount?.toFixed(2)}</Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Token Paid</Text>
            <Text style={styles.tokenPaid}>₹{item.token_amount?.toFixed(2)}</Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Balance</Text>
            <Text style={styles.balanceAmount}>₹{item.balance_amount?.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Mode */}
        {item.payment_mode && (
          <View style={styles.paymentModeContainer}>
            <Icon name="card-outline" size={12} color="#666" />
            <Text style={styles.paymentModeText}>
              Payment: {item.payment_mode}
            </Text>
          </View>
        )}

        {/* OTP Verified Status */}
        {item.otp_verified === 1 && (
          <View style={styles.verifiedBadge}>
            <Icon name="checkmark-circle" size={12} color="#4CAF50" />
            <Text style={styles.verifiedText}>OTP Verified</Text>
          </View>
        )}

        {/* Remarks */}
        {item.remarks ? (
          <View style={styles.remarksContainer}>
            <Icon name="chatbubble-outline" size={12} color="#810a45" />
            <Text style={styles.remarksText} numberOfLines={2}>
              Note: {item.remarks}
            </Text>
          </View>
        ) : null}

        {/* Cancel Reason */}
        {isCancelled && item.cancel_reason && (
          <View style={styles.cancelReasonContainer}>
            <Icon name="alert-circle-outline" size={12} color="#F44336" />
            <Text style={styles.cancelReasonText}>
              Cancelled: {item.cancel_reason}
            </Text>
            {item.cancelled_by && (
              <Text style={styles.cancelledByText}>by {item.cancelled_by}</Text>
            )}
          </View>
        )}

        {/* Completed At */}
        {isCompleted && item.completed_at && (
          <View style={styles.completedContainer}>
            <Icon name="checkmark-circle-outline" size={12} color="#4CAF50" />
            <Text style={styles.completedText}>
              Completed: {formatDateTime(item.completed_at)}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.rideStats}>
          <View style={styles.statItem}>
            <Icon name="cash-outline" size={14} color="#4CAF50" />
            <Text style={[styles.statItemText, styles.earningsText]}>
              Earned: ₹{item.earnings?.toFixed(2)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="receipt-outline" size={14} color="#666" />
            <Text style={styles.statItemText}>ID: {item.booking_id}</Text>
          </View>
        </View>

        <View style={styles.detailsIndicator}>
          <Text style={styles.detailsText}>View booking details</Text>
          <Icon name="chevron-forward" size={14} color="#810a45" />
        </View>
      </TouchableOpacity>
    );
  };

  // Render Parcel Card
  const renderParcelCard = ({ item }) => (
    <TouchableOpacity
      style={styles.rideCard}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.dateTimeContainer}>
          <Icon name="calendar-outline" size={14} color="#FF9800" />
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          <Icon name="time-outline" size={14} color="#FF9800" style={styles.timeIcon} />
          <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
        </View>
        <View style={styles.badgeRow}>
          <View style={styles.parcelBadge}>
            <Icon name="cube-outline" size={10} color="#fff" />
            <Text style={styles.parcelBadgeText}>Parcel</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Icon name={getStatusIcon(item.status)} size={12} color="#fff" />
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.rideLocation}>
        <View style={styles.locationPoint}>
          <Icon name="location" size={16} color="#FF9800" />
          <View style={styles.locationLine} />
        </View>
        <View style={styles.locationTextWrap}>
          <Text style={styles.locationLabel}>Pickup</Text>
          <Text style={styles.locationText} numberOfLines={2}>
            {item.pickup}, {item.pickup_city}
          </Text>
          {item.pickup_landmark ? (
            <Text style={styles.landmarkText}>📍 {item.pickup_landmark}</Text>
          ) : null}
          <Text style={styles.dateTimeDetail}>
            📅 {new Date(item.pickup_date).toLocaleDateString()} at {item.pickup_time}
          </Text>
        </View>
      </View>

      <View style={styles.rideLocation}>
        <View style={styles.locationPoint}>
          <Icon name="flag" size={16} color="#4CAF50" />
        </View>
        <View style={styles.locationTextWrap}>
          <Text style={styles.locationLabel}>Delivery</Text>
          <Text style={styles.locationText} numberOfLines={2}>
            {item.delivery_address}, {item.delivery_city}
          </Text>
          {item.delivery_landmark ? (
            <Text style={styles.landmarkText}>📍 {item.delivery_landmark}</Text>
          ) : null}
          <Text style={styles.contactText}>👤 {item.receiver_name}</Text>
          {/* <Text style={styles.contactText}>📞 {item.receiver_mobile}</Text> */}
        </View>
      </View>

      {item.remarks ? (
        <View style={styles.remarksContainer}>
          <Icon name="chatbubble-outline" size={12} color="#FF9800" />
          <Text style={styles.remarksText} numberOfLines={2}>
            Note: {item.remarks}
          </Text>
        </View>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.rideFooter}>
        <View style={styles.rideInfo}>
          <Icon name="person-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.customerName}</Text>
        </View>
        <Text style={styles.priceText}>₹{item.amount?.toFixed(2)}</Text>
      </View>

      <View style={styles.rideStats}>
        <View style={styles.statItem}>
          <Icon name="cube-outline" size={14} color="#999" />
          <Text style={styles.statItemText}>Weight: {item.parcel_weight} kg</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="archive-outline" size={14} color="#999" />
          <Text style={styles.statItemText}>{item.packaging_material}</Text>
        </View>
      </View>

      <View style={styles.rideStats}>
        <View style={styles.statItem}>
          <Icon name="cash-outline" size={14} color="#4CAF50" />
          <Text style={[styles.statItemText, styles.earningsText]}>
            Earned: ₹{item.earnings?.toFixed(2)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="receipt-outline" size={14} color="#666" />
          <Text style={styles.statItemText}>ID: {item.booking_id}</Text>
        </View>
      </View>

      {(item.pickup_otp_verified === 1 || item.delivery_otp_verified === 1) && (
        <View style={styles.verificationContainer}>
          {item.pickup_otp_verified === 1 && (
            <View style={styles.verifiedBadge}>
              <Icon name="checkmark-circle" size={12} color="#4CAF50" />
              <Text style={styles.verifiedText}>Pickup Verified</Text>
            </View>
          )}
          {item.delivery_otp_verified === 1 && (
            <View style={styles.verifiedBadge}>
              <Icon name="checkmark-circle" size={12} color="#4CAF50" />
              <Text style={styles.verifiedText}>Delivery Verified</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.detailsIndicator}>
        <Text style={styles.detailsText}>View delivery details</Text>
        <Icon name="chevron-forward" size={14} color="#FF9800" />
      </View>
    </TouchableOpacity>
  );

  // Render Ride Card (existing)
  const renderRideCard = ({ item }) => (
    <TouchableOpacity
      style={styles.rideCard}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.dateTimeContainer}>
          <Icon name="calendar-outline" size={14} color="#FF1493" />
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
          <Icon name="time-outline" size={14} color="#FF1493" style={styles.timeIcon} />
          <Text style={styles.timeText}>{formatTime(item.date)}</Text>
        </View>
        <View style={styles.badgeRow}>
          {item.is_incity && (
            <View style={styles.incityBadge}>
              <Icon name="navigate-outline" size={10} color="#fff" />
              <Text style={styles.incityBadgeText}>In-City</Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Icon name={getStatusIcon(item.status)} size={12} color="#fff" />
            <Text style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.rideLocation}>
        <View style={styles.locationPoint}>
          <Icon name="location" size={16} color="#FF1493" />
          <View style={styles.locationLine} />
        </View>
        <View style={styles.locationTextWrap}>
          <Text style={styles.locationLabel}>Pickup</Text>
          <Text style={styles.locationText} numberOfLines={2}>{item.pickup}</Text>
        </View>
      </View>

      <View style={styles.rideLocation}>
        <View style={styles.locationPoint}>
          <Icon name="flag" size={16} color="#4CAF50" />
          {item.service_name?.includes('Rental') && item.to_city ? <View style={styles.locationLine} /> : null}
          {item.service_name?.includes('Driver') && item.to_city ? <View style={styles.locationLine} /> : null}
        </View>
        <View style={styles.locationTextWrap}>
          <Text style={styles.locationLabel}>Drop</Text>
          <Text style={styles.locationText} numberOfLines={2}>{item.destination}</Text>
        </View>
      </View>

      {item.service_name?.includes('Rental') && item.to_city ? (
        <View style={styles.rideLocation}>
          <View style={styles.locationPoint}>
            <Icon name="navigate" size={16} color="#810a45" />
          </View>
          <View style={styles.locationTextWrap}>
            <Text style={styles.locationLabel}>To City</Text>
            <Text style={[styles.locationText, styles.toCityText]} numberOfLines={2}>{item.to_city}</Text>
          </View>
        </View>
      ) : null}
      {item.service_name?.includes('Driver') && item.to_city ? (
        <View style={styles.rideLocation}>
          <View style={styles.locationPoint}>
            <Icon name="navigate" size={16} color="#810a45" />
          </View>
          <View style={styles.locationTextWrap}>
            <Text style={styles.locationLabel}>To City</Text>
            <Text style={[styles.locationText, styles.toCityText]} numberOfLines={2}>{item.to_city}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.rideFooter}>
        <View style={styles.rideInfo}>
          <Icon name="person-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.riderName}</Text>
        </View>
        <Text style={styles.priceText}>₹{item.price?.toFixed(2)}</Text>
      </View>

      {!item.is_incity && item.topupAmount > 0 && (
        <View style={styles.topupInfo}>
          <Icon name="trending-up" size={12} color="#FF9800" />
          <Text style={styles.topupText}>
            Topup: ₹{item.topupAmount?.toFixed(2)} ({item.topups?.length || 0} requests)
          </Text>
        </View>
      )}

      <View style={styles.rideStats}>
        <View style={styles.statItem}>
          <Icon name="speedometer-outline" size={14} color="#999" />
          <Text style={styles.statItemText}>{item.distance} km</Text>
        </View>
        {item.is_incity ? (
          <View style={styles.statItem}>
            <Icon name="people-outline" size={14} color="#999" />
            <Text style={styles.statItemText}>{item.person} passenger</Text>
          </View>
        ) : (
          <>
            <View style={styles.statItem}>
              <Icon name="time-outline" size={14} color="#999" />
              <Text style={styles.statItemText}>{item.duration} hour{item.duration > 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="people-outline" size={14} color="#999" />
              <Text style={styles.statItemText}>{item.person} passenger</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.rideStats}>
        <View style={styles.statItem}>
          <Icon name="cash-outline" size={14} color="#4CAF50" />
          <Text style={[styles.statItemText, styles.earningsText]}>
            Earned: ₹{item.earnings?.toFixed(2)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="receipt-outline" size={14} color="#666" />
          <Text style={styles.statItemText}>ID: {item.booking_id}</Text>
        </View>
      </View>

      {item.rating > 0 && (
        <View style={styles.ratingContainer}>
          <Icon name="star" size={12} color="#FFD700" />
          <Text style={styles.ratingText}>Rating: {item.rating}</Text>
        </View>
      )}

      <View style={styles.detailsIndicator}>
        <Text style={styles.detailsText}>View ride details</Text>
        <Icon name="chevron-forward" size={14} color="#FF1493" />
      </View>
    </TouchableOpacity>
  );

  // Get header gradient colors based on service type
  const getHeaderColors = () => {
    if (isOnSpotCaptain) return ['#FF9800', '#FF9800', '#e20f7a'];
    if (isParcelDriver) return ['#FF9800', '#FF9800', '#F57C00'];
    return ['#ff7f50', '#ff7f50', '#e20f7a'];
  };

  // Get header title based on service type
  const getHeaderTitle = () => {
    if (isOnSpotCaptain) return 'OnSpot History';
    if (isParcelDriver) return 'Delivery History';
    return 'Ride History';
  };

  // Get primary color based on service type
  const getPrimaryColor = () => {
    if (isOnSpotCaptain) return '#810a45';
    if (isParcelDriver) return '#FF9800';
    return '#FF1493';
  };

  const renderHeader = () => (
    <>
      <LinearGradient
        colors={getHeaderColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
      </LinearGradient>
      <View style={styles.statsHeader}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Icon name={isOnSpotCaptain ? "flash-outline" : (isParcelDriver ? "cube-outline" : "car-outline")} size={24} color={getPrimaryColor()} />
            <Text style={styles.statNumber}>{totalCount || stats.totalRides}</Text>
            <Text style={styles.statLabel}>
              {isOnSpotCaptain ? 'Total Bookings' : (isParcelDriver ? 'Total Deliveries' : 'Total Rides')}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="cash-outline" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>₹{stats.totalEarnings?.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>
          {isOnSpotCaptain ? 'Recent Bookings' : (isParcelDriver ? 'Recent Deliveries' : 'Recent Rides')}
        </Text>
      </View>
    </>
  );

  // Render footer loader
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={getPrimaryColor()} />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  // Render empty state
  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Icon name={isOnSpotCaptain ? "flash-outline" : (isParcelDriver ? "cube-outline" : "car-outline")} size={80} color="#ccc" />
        <Text style={styles.emptyText}>
          {isOnSpotCaptain ? 'No bookings yet' : (isParcelDriver ? 'No deliveries yet' : 'No rides yet')}
        </Text>
        <Text style={styles.emptySubtext}>
          {isOnSpotCaptain 
            ? 'Complete your first OnSpot booking to see it here' 
            : (isParcelDriver 
              ? 'Complete your first delivery to see it here' 
              : 'Complete your first ride to see it here')}
        </Text>
        <TouchableOpacity 
          style={[styles.refreshButton, { backgroundColor: getPrimaryColor() }]}
          onPress={onRefresh}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Get render item function based on service type
  const getRenderItem = () => {
    if (isOnSpotCaptain) return renderOnSpotCard;
    if (isParcelDriver) return renderParcelCard;
    return renderRideCard;
  };

  if (isLoading && !refreshing && rideHistory.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={getPrimaryColor()} />
        <Text style={styles.loadingText}>
          {isOnSpotCaptain ? 'Loading booking history...' : (isParcelDriver ? 'Loading delivery history...' : 'Loading ride history...')}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rideHistory}
      renderItem={getRenderItem()}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[getPrimaryColor()]}
          tintColor={getPrimaryColor()}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    backgroundColor: '#f5f5f5',
    flexGrow: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  statsHeader: {
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
    paddingHorizontal: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    margin: 1,
  },
  statNumber: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginHorizontal: 10,
  },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginHorizontal: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  timeIcon: {
    marginLeft: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  incityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  incityBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  onspotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#810a45',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  onspotBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  parcelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  parcelBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  customerPhone: {
    fontSize: 12,
    color: '#666',
  },
  rideLocation: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  locationPoint: {
    width: 24,
    alignItems: 'center',
    marginRight: 8,
  },
  locationLine: {
    width: 2,
    height: 20,
    backgroundColor: '#ddd',
    marginTop: 4,
  },
  locationTextWrap: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  landmarkText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cityText: {
    fontSize: 12,
    color: '#810a45',
    marginTop: 2,
    fontWeight: '500',
  },
  scheduleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  scheduleText: {
    fontSize: 12,
    color: '#810a45',
    fontWeight: '500',
  },
  dateTimeDetail: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  contactText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  toCityText: {
    color: '#810a45',
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  tokenPaid: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  balanceAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
  },
  paymentModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  paymentModeText: {
    fontSize: 11,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rideInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  topupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  topupText: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '500',
  },
  rideStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statItemText: {
    fontSize: 12,
    color: '#666',
  },
  earningsText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  ratingText: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '600',
  },
  remarksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  remarksText: {
    flex: 1,
    fontSize: 12,
    color: '#FF9800',
    fontStyle: 'italic',
  },
  cancelReasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  cancelReasonText: {
    flex: 1,
    fontSize: 12,
    color: '#F44336',
  },
  cancelledByText: {
    fontSize: 10,
    color: '#F44336',
    fontWeight: '500',
  },
  completedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  completedText: {
    fontSize: 11,
    color: '#4CAF50',
  },
  verificationContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '500',
  },
  detailsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    gap: 4,
  },
  detailsText: {
    fontSize: 11,
    fontWeight: '500',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  refreshButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});

export default DriverHistoryScreen;