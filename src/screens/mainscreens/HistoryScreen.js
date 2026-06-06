import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { GET_DRIVER_BOOKING_HISTORY, GET_BA_BOOKING_HISTORY } from '../../redux/actions/action-creator';
import LinearGradient from 'react-native-linear-gradient';

const DriverHistoryScreen = ({ navigation }) => {
  const [rideHistory, setRideHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalRides: 0,
    totalEarnings: 0,
    avgRating: 0,
  });

  const dispatch = useDispatch();
  const loginToken = useSelector((state) => state?.auth?.loginToken);
  const { userData } = useSelector((state) => state.auth);
  const isBA = !!userData?.ba_name;

  const fetchBookingHistory = async () => {
    try {
      setIsLoading(true);
      const getHistory = isBA ? GET_BA_BOOKING_HISTORY : GET_DRIVER_BOOKING_HISTORY;
      const res = await dispatch(getHistory());
      console.log('Booking history response:', res);

      if (res?.status && res?.data) {
        const formattedHistory = res.data.map(booking => formatRideData(booking));
        setRideHistory(formattedHistory);
        calculateStats(formattedHistory);
      } else {
        setRideHistory([]);
      }
    } catch (error) {
      console.log('Error fetching booking history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatRideData = (booking) => {
    console.log('booking-->',booking);
    
    
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
      ? (completedRides.reduce((sum, ride) => sum + ride.rating, 0) / completedRides.length).toFixed(1)
      : 0;

    setStats({
      totalRides,
      totalEarnings,
      avgRating,
    });
  };

  useEffect(() => {
    fetchBookingHistory();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookingHistory();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    return status === 'completed' ? '#4CAF50' : '#FF5252';
  };

  const getStatusIcon = (status) => {
    return status === 'completed' ? 'checkmark-circle' : 'close-circle';
  };

  const formatDate = (dateString) => {
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

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleRidePress = (ride) => {
    navigation.navigate('BookingHistoryDetail', { ride });
  };

  const renderHeader = () => (
      <>
      <LinearGradient
        colors={['#ff7f50', '#ff7f50', '#e20f7a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Ride History</Text>
      </LinearGradient>
    <View style={styles.statsHeader}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="car-outline" size={24} color="#FF1493" />
          <Text style={styles.statNumber}>{stats.totalRides}</Text>
          <Text style={styles.statLabel}>Total Rides</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="cash-outline" size={24} color="#4CAF50" />
          <Text style={styles.statNumber}>₹{stats.totalEarnings.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total Earnings</Text>
        </View>
        {/* <View style={styles.statCard}>
          <Icon name="star-outline" size={24} color="#FFD700" />
          <Text style={styles.statNumber}>{stats.avgRating}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View> */}
      </View>
      <Text style={styles.sectionTitle}>Recent Rides</Text>
    </View>
    </>
  );

  const renderRideCard = ({ item }) => (
    <TouchableOpacity
      style={styles.rideCard}
      onPress={() => handleRidePress(item)}
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

      {console.log('item-->', item)}
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
          {/* {item.userMobile && (
            <>
              <Icon name="call-outline" size={14} color="#999" style={styles.phoneIcon} />
              <Text style={styles.phoneText}>{item.userMobile}</Text>
            </>
          )} */}
        </View>
        <Text style={styles.priceText}>₹{item.price.toFixed(2)}</Text>
      </View>

      {!item.is_incity && item.topupAmount > 0 && (
        <View style={styles.topupInfo}>
          <Icon name="trending-up" size={12} color="#FF9800" />
          <Text style={styles.topupText}>
            Topup: ₹{item.topupAmount.toFixed(2)} ({item.topups?.length || 0} requests)
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
            Earned: ₹{item.earnings.toFixed(2)}
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

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF1493" />
        <Text style={styles.loadingText}>Loading ride history...</Text>
      </View>
    );
  }

  if (rideHistory.length === 0 && !isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="car-outline" size={80} color="#ccc" />
        <Text style={styles.emptyText}>No rides yet</Text>
        <Text style={styles.emptySubtext}>Complete your first ride to see it here</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchBookingHistory}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    
    <FlatList
      data={rideHistory}
      renderItem={renderRideCard}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={renderHeader}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#FF1493']}
          tintColor="#FF1493"
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    // padding: 15,
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
  statsHeader: {
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
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
     margin:1
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
     margin:10
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
    margin:10
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
  toCityText: {
    color: '#810a45',
    fontWeight: '600',
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
  phoneIcon: {
    marginLeft: 12,
  },
  phoneText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
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
    color: '#FF1493',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
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
    backgroundColor: '#FF1493',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
});

export default DriverHistoryScreen;
