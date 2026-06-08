import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  Animated,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import {
  BA_ACCEPT_BOOKING,
  BA_ASSIGN_DRIVER,
  BA_GET_DRIVER_LIST,
  GET_BA_BOOKING_HISTORY,
  REJECT_BOOKING,
  CANCEL_BOOKING,
  COMPLETE_RIDE,
  START_RIDE,
} from '../../redux/actions/action-creator';

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

const getStatusColor = (status) => STATUS_COLORS[status] || '#757575';
const getStatusText = (status) => STATUS_TEXT[status] || status;

const BAHomeFlow = ({ navigation }) => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.auth);

  const [refreshing, setRefreshing] = useState(false);

  const [baPendingBookings, setBaPendingBookings] = useState([]);
  const [bsActiveBookings, setBsActiveBookings] = useState([]);

  // Sound tracking for new SEARCHING booking
  const prevPendingBookingIdRef = useRef(null);


  const [isLoading, setIsLoading] = useState(false);

  const [baDrivers, setBaDrivers] = useState([]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningBookingId, setAssigningBookingId] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchBABookings = async () => {
    try {
      const res = await dispatch(GET_BA_BOOKING_HISTORY());
      if (res?.status && Array.isArray(res.data)) {
        const searching = res.data.filter((b) => b.status === 'SEARCHING');
        setBaPendingBookings(searching);
      } else {
        setBaPendingBookings([]);
      }
    } catch (e) {
      console.log('fetchBABookings error:', e);
      setBaPendingBookings([]);
    }
  };

  const fetchCurrentRide = async () => {
    try {
      const res = await dispatch(require('../../redux/actions/action-creator').BA_GET_CURRENT_BOOKING());
      if (res?.status && res?.data) {
        const bookings = Array.isArray(res.data) ? res.data : [res.data];
        setBsActiveBookings(bookings);
      } else {
        setBsActiveBookings([]);
      }
    } catch (e) {
      setBsActiveBookings([]);
    }
  };

  const loadBADrivers = async () => {
    try {
      const res = await dispatch(BA_GET_DRIVER_LIST());
      if (res?.status && res?.data) {
        setBaDrivers(Array.isArray(res.data) ? res.data : []);
      } else {
        setBaDrivers([]);
      }
    } catch (e) {
      console.log('loadBADrivers error:', e);
      setBaDrivers([]);
    }
  };

  useEffect(() => {
    if (!userData?.ba_name) return;
    fetchBABookings();
    fetchCurrentRide();
    loadBADrivers();

    const interval = setInterval(() => {
      fetchBABookings();
      fetchCurrentRide();
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.ba_name]);


  // Play ring on new BA SEARCHING booking, stop when cleared
  useEffect(() => {
    const firstPending = baPendingBookings?.[0];
    const firstPendingId = firstPending?.booking_id || firstPending?.id;

    if (firstPendingId && firstPendingId !== prevPendingBookingIdRef.current) {
      prevPendingBookingIdRef.current = firstPendingId;
      SoundHelper?.playNotificationSound();
    } else if (!firstPendingId) {
      prevPendingBookingIdRef.current = null;
      SoundHelper?.stopNotificationSound();
    }
  }, [baPendingBookings]);

  const [baServices, setBaServices] = useState([]);

  const fetchBAServices = async () => {
    try {
      const res = await dispatch(require('../../redux/actions/action-creator').BA_GET_SERVICES());
      const list = res?.data?.data ?? res?.data ?? res ?? [];
      setBaServices(Array.isArray(list) ? list : []);
    } catch (e) {
      console.log('fetchBAServices error:', e);
      setBaServices([]);
    }
  };

  useEffect(() => {
    if (!userData?.ba_name) return;
    fetchBAServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.ba_name]);


  // Stop sound on unmount
  useEffect(() => {
    return () => SoundHelper?.stopNotificationSound();
  }, []);

  const filteredBAServiceIds = new Set([72, 73]);
  const filteredServices = baServices.filter((s) => filteredBAServiceIds.has(Number(s.service_id)));

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchBABookings(), fetchCurrentRide()]);
    } finally {
      setRefreshing(false);
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
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBAAssignDriver = async (driverId) => {
    setIsAssigning(true);
    try {
      const res = await dispatch(
        BA_ASSIGN_DRIVER({
          booking_id: assigningBookingId,
          driver_id: driverId,
        })
      );
      if (res?.status) {
        Alert.alert('Success', 'Driver assigned successfully');
        setShowAssignModal(false);
        setAssigningBookingId(null);
        fetchBABookings();
        fetchCurrentRide();
      } else {
        Alert.alert('Error', res?.message || 'Failed to assign driver');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsAssigning(false);
    }
  };

  const renderBABookingCard = (booking) => (
    <View key={booking.booking_id} style={styles.activeRideCard}>
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
          </View>
          <View style={styles.locationTextCol}>
            <Text style={styles.locationLabel}>Drop</Text>
            <Text style={styles.dropText}>{booking.drop_address || booking.drop_city}</Text>
          </View>
        </View>
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
                  const res = await dispatch(
                    REJECT_BOOKING({ role: 'business_associate', booking_id: booking.booking_id })
                  );
                  if (res?.status) fetchBABookings();
                  else Alert.alert('Error', res?.message || 'Failed to cancel');
                },
              },
            ]);
          }}
          disabled={isLoading}
        >
          <Icon name="x" size={20} color="#fff" />
          <Text style={styles.btnText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.acceptBtn} onPress={() => handleBAAccept(booking.booking_id)} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" size="small" /> : (
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
    const bookingId = booking?.booking_id || booking?.id;

    const pickupLocation = booking?.pickup_address || booking?.pickup_city;
    const dropLocation = booking?.drop_address || booking?.drop_city;
    const to_city = booking?.to_city || booking?.to_city;

    return (
      <View key={bookingId} style={styles.activeRideCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Text style={styles.statusBadgeText}>{driverstatus === 'REASSIGN' ? getStatusText(driverstatus) : getStatusText(status)}</Text>
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
        {to_city &&  <View style={styles.locationEntryRow}>
            <View style={styles.dotCol}>
              <View style={styles.pickupDot} />
              <View style={styles.locationLine} />
            </View>
            <View style={styles.locationTextCol}>
              <Text style={styles.locationLabel}>TO City</Text>
              <Text style={styles.pickupText}>{to_city}</Text>
            </View>
          </View>}

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

        {status === 'TOKEN_PAID' && (
          <TouchableOpacity
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
          </TouchableOpacity>
        )}

        {status === 'ASSIGN' && (
          <TouchableOpacity
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
          </TouchableOpacity>
        )}
      </View>
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

  return (
    <View style={styles.outer}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF1493']} tintColor="#FF1493" />}
      >
        <StatsCard />
 {filteredServices.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 16 }]}>Self Sharing Services</Text>

            {filteredServices.map((svc) => (
              <TouchableOpacity
                key={svc.id?.toString() || String(svc.service_id)}
                style={styles.serviceOption}
                onPress={() =>
                  navigation.navigate('SelfSharingCreateTrip', {
                    service_id: Number(svc.service_id),
                  })
                }
              >
                <Text style={styles.serviceOptionText}>{svc.title || 'Service'}</Text>
                <Icon name="chevron-right" size={18} color="#ccc" />
              </TouchableOpacity>
            ))}
          </>
        ) : null}
        
        {baPendingBookings.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 8 }]}>New Requests</Text>
            {baPendingBookings.map((booking) => renderBABookingCard(booking))}
          </>
        ) : bsActiveBookings.length === 0 ? (
          <View style={styles.waitingContainer}>
            <Animated.View style={styles.waitingContent}>
              <Icon name="inbox" size={60} color="#ccc" />
              <Text style={styles.waitingTitle}>No Pending Bookings</Text>
              <Text style={styles.waitingText}>New booking requests will appear here automatically.</Text>
            </Animated.View>
          </View>
        ) : null}

        {bsActiveBookings.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 8 }]}>Active Bookings</Text>
            {bsActiveBookings.map((booking) => renderBAActiveBookingCard(booking))}
          </>
        ) : null}

       

        {/* Divider */}
        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal visible={showAssignModal} transparent animationType="slide" onRequestClose={() => setShowAssignModal(false)}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>Assign Driver</Text>
            <Text style={styles.modalSubtitle}>Select a driver for this booking</Text>

            <FlatList
              data={baDrivers}
              keyExtractor={(item, i) => item.id?.toString() || i.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.driverSelectItem} onPress={() => handleBAAssignDriver(item.id)} disabled={isAssigning}>
                  <View style={styles.driverSelectLeft}>
                    <View style={styles.driverSelectAvatar}>
                      <Icon name="user" size={20} color="#FF1493" />
                    </View>
                    <View>
                      <Text style={styles.driverSelectName}>{item.full_name || item.name}</Text>
                      <Text style={styles.driverSelectPhone}>{item.phone || item.mobile}</Text>
                    </View>
                  </View>

                  {isAssigning ? <ActivityIndicator size="small" color="#FF1493" /> : <Icon name="chevron-right" size={18} color="#ccc" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyDriverText}>No drivers available</Text>}
            />

            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn, { marginTop: 10 }]} onPress={() => setShowAssignModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: { flex: 1 },
  content: { flex: 1, padding: 15 },

  statsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, padding: 20, marginBottom: 15 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: '#e0e0e0', alignSelf: 'center' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },

  waitingContainer: { backgroundColor: '#fff', borderRadius: 15, padding: 30, alignItems: 'center', marginBottom: 15 },
  waitingContent: { alignItems: 'center' },
  waitingTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 10 },
  waitingText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },

  activeRideCard: { backgroundColor: '#fff', borderRadius: 15, padding: 20, marginBottom: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  requestBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF1493', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  requestBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 6 },
  fareAmount: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50' },

  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

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

  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },

  driverSelectItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  driverSelectLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverSelectAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff0f8', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FF1493' },
  driverSelectName: { fontSize: 15, fontWeight: '600', color: '#222' },
  driverSelectPhone: { fontSize: 13, color: '#888', marginTop: 2 },
  emptyDriverText: { textAlign: 'center', color: '#999', padding: 20, fontSize: 14 },

  serviceOption: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  serviceOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },

  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#f0f0f0' },
  cancelBtnText: { color: '#666', fontSize: 16, fontWeight: '500' },
});

export default BAHomeFlow;

