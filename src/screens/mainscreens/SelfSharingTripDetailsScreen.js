import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
} from 'react-native';

import Icon from 'react-native-vector-icons/Feather';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import SelfSharingService from '../../services/SelfSharingService';

const SelfSharingTripDetailsScreen = ({ navigation, route }) => {
  const { tripId ,status} = route.params || {};

  const [loading, setLoading] = useState(false);
  const [trip, setTrip] = useState(null);
  const [bookings, setBookings] = useState([]);

  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);


const fetchTrip = async () => {
  if (!tripId) return;
  setLoading(true);

  try {
    const res = await SelfSharingService.getTripDetails(tripId);
    console.log('Trip details response:', res);

    let tripData = null;
    let bookingsData = [];

    if (res?.data?.data) {
      if (Array.isArray(res.data.data)) {
        // Filter out cancelled bookings
        bookingsData = res.data.data.filter(
          (booking) => booking.status !== "CANCELLED"
        );

        tripData = res.data.trip || res.data;
      } else {
        tripData = res.data.data;
      }
    } else if (res?.data) {
      tripData = res.data;
    } else if (res?.trip) {
      tripData = res.trip;

      // Filter here as well
      bookingsData = (res.bookings || []).filter(
        (booking) => booking.status !== "CANCELLED"
      );
    } else {
      tripData = res;
    }

    setTrip(tripData);
    setBookings(bookingsData);
  } catch (e) {
    Alert.alert('Error', 'Failed to load trip details');
    console.log('fetchTrip error:', e);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const handleArrive = async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const res = await SelfSharingService.arrive({ trip_id: tripId });
      const ok = res?.status ?? res?.success ?? true;
      if (ok || res?.data?.status || res?.data?.success) {
        Alert.alert('Success', 'Arrived submitted');
        navigation.goBack();
      } else {
        Alert.alert('Error', res?.message || 'Failed to submit arrive');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to submit arrive');
      console.log('handleArrive error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRide = async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const res = await SelfSharingService.startRide({ trip_id: tripId });
      const ok = res?.status ?? res?.success ?? true;
     
      if (ok || res?.data?.status || res?.data?.success) {
        Alert.alert('Success', 'Ride started');
        navigation.goBack();
      } else {
        Alert.alert('Error', res?.message || 'Failed to start ride');
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data.message);
      console.log('handleStartRide error:', e.response?.data.message || e);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const res = await SelfSharingService.completeRide({ trip_id: tripId });
      const ok = res?.status ?? res?.success ?? true;
      if (ok || res?.data?.status || res?.data?.success) {
        Alert.alert('Success', 'Ride completed');
        navigation.goBack();
      } else {
        Alert.alert('Error', res?.message || 'Failed to complete ride');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to complete ride');
      console.log('handleCompleteRide error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRide = async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const res = await SelfSharingService.cancelRide({ trip_id: tripId });
      const ok = res?.status ?? res?.success ?? true;
      if (ok || res?.data?.status || res?.data?.success) {
        Alert.alert('Success', 'Ride canceled');
        navigation.goBack();
      } else {
        Alert.alert('Error', res?.message || 'Failed to cancel ride');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to cancel ride');
      console.log('handleCancelRide error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCallPassenger = (phoneNumber) => {
    if (!phoneNumber) {
      Alert.alert('Error', 'No phone number available');
      return;
    }
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Cannot make calls on this device');
        }
      })
      .catch((err) => console.log('Error making call:', err));
  };

  const renderRow = (label, value) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <View style={s.row}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowValue}>{String(value)}</Text>
      </View>
    );
  };

  const openOtpModalForBooking = (booking) => {
    setSelectedBooking(booking);
    setOtpInput('');
    setOtpModalVisible(true);
  };

  const handleVerifyOtp = async () => {
    if (!selectedBooking?.booking_id || !tripId) return;

    const otp = otpInput?.trim();
    if (!otp) {
      Alert.alert('Error', 'Please enter OTP');
      return;
    }

    setVerifyingOtp(true);
  try {
  const res = await SelfSharingService.verifyOtp({
    trip_id: tripId,
    booking_id: selectedBooking.booking_id,
    otp,
  });

  if (res?.status) {
    Alert.alert('Success', res?.message || 'OTP verified');

    setOtpModalVisible(false);
    setSelectedBooking(null);

    navigation.goBack();
  } else {
    Alert.alert('Error', res?.message);
  }
} catch (e) {
  Alert.alert(
    'Error',
    e?.response?.data?.responseData?.message ||
    e?.response?.data?.message ||
    'OTP verification failed'
  );
} finally {
      setVerifyingOtp(false);
    }
  };

  const renderBookingCard = (booking, index) => {
    return (
      <View key={booking.id || index} style={s.bookingCard}>
        <Text style={s.bookingTitle}>Booking #{booking.booking_id || index + 1}</Text>
        
        {(booking.user_name || booking.user_mobile) ? (
          <View style={s.driverCard}>
            <View style={s.driverRow}>
              <View style={s.driverAvatar}>
                <FontAwesome5 name="user-circle" size={36} color="#FF1493" />
              </View>
              <View style={s.driverMeta}>
                <Text style={s.driverName}>{booking.user_name || 'Passenger'}</Text>
                {booking.user_mobile ? (
                  <TouchableOpacity style={s.callRow} onPress={() => handleCallPassenger(booking.user_mobile)}>
                    <Icon name="phone" size={14} color="#4CAF50" />
                    <Text style={s.driverPhone}>{booking.user_mobile}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {booking.user_mobile ? (
                <TouchableOpacity style={s.callBtn} onPress={() => handleCallPassenger(booking.user_mobile)}>
                  <Icon name="phone-call" size={20} color="#fff" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}
        
        <View style={s.bookingRow}>
          <Text style={s.bookingLabel}>Seats:</Text>
          <Text style={s.bookingValue}>{booking.seats || 0}</Text>
        </View>
        
        <View style={s.bookingRow}>
          <Text style={s.bookingLabel}>Total Fare:</Text>
          <Text style={s.bookingValue}>₹{booking.total_fare || 0}</Text>
        </View>
        
        <View style={s.bookingRow}>
          <Text style={s.bookingLabel}>Token Amount:</Text>
          <Text style={s.bookingValue}>₹{booking.token_amount || 0}</Text>
        </View>
        
        <View style={s.bookingRow}>
          <Text style={s.bookingLabel}>Balance:</Text>
          <Text style={s.bookingValue}>₹{booking.balance_amount || 0}</Text>
        </View>
        
        <View style={s.bookingRow}>
          <Text style={s.bookingLabel}>Status:</Text>
          <View style={[
            s.statusBadge,
            booking.status === 'TOKEN_PAID' && s.statusTokenPaid,
            booking.status === 'COMPLETED' && s.statusCompleted,
            booking.status === 'CANCELLED' && s.statusCancelled,
          ]}>
            <Text style={s.statusText}>{booking.status || 'PENDING'}</Text>
          </View>
        </View>

        {booking.passengers && booking.passengers.length > 0 && (
          <View style={s.passengersContainer}>
            <Text style={s.passengersTitle}>Passenger Details:</Text>
            {booking.passengers.map((passenger, idx) => (
              <View key={passenger.id || idx} style={s.passengerItem}>
                <Icon name="user" size={14} color="#FF1493" style={{ marginRight: 4 }} />
                <Text style={s.passengerText}>
                  {passenger.name} ({passenger.age} Yrs)
                </Text>
              </View>
            ))}
          </View>
        )}
        
       

        {booking.status !== 'BOARDED' && booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED' && booking.status !== 'STARTED' && (
          <TouchableOpacity
            style={[s.actionBtn, s.verifyOtpBtn]}
            onPress={() => openOtpModalForBooking(booking)}
            disabled={loading || verifyingOtp}
          >
          {verifyingOtp && selectedBooking?.booking_id === booking.booking_id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="check" size={18} color="#fff" />
              <Text style={s.verifyOtpText}>Verify OTP</Text>
            </>
          )}
        </TouchableOpacity>
        )}

        <View style={s.bookingRow}>
          <Text style={s.bookingLabel}>Booked At:</Text>
          <Text style={s.bookingValue}>
            {booking.created_at ? new Date(booking.created_at).toLocaleString() : 'N/A'}
          </Text>
        </View>
        
        {booking.payment_mode && (
          <View style={s.bookingRow}>
            <Text style={s.bookingLabel}>Payment Mode:</Text>
            <Text style={s.bookingValue}>{booking.payment_mode}</Text>
          </View>
        )}
      </View>
    );
  };

  const mainTitle = useMemo(() => {
    return trip?.trip_id || trip?.id || tripId || 'Trip';
  }, [trip, tripId]);

  return (
    <View style={s.container}>
      <LinearGradient
        colors={['#ff7f50', '#ff7f50', '#e20f7a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Trip Details</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll}>

        {loading && !trip && bookings.length === 0 ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#FF1493" />
            <Text style={s.loadingText}>Loading...</Text>
          </View>
        ) : null}

        {trip ? (
          <View style={s.card}>
            <Text style={s.tripIdText}>{mainTitle}</Text>

            {renderRow('From', trip.from_city || trip.fromCity || trip.from)}
            {renderRow('To', trip.to_city || trip.toCity || trip.to)}
            {renderRow('Pickup Address', trip.pickup_address || trip.pickupAddress)}
            {renderRow('Departure Time', trip.departure_time || trip.departureTime)}

            {renderRow('Total Seats', trip.total_seats || trip.totalSeats)}
            {renderRow('Token Fare', trip.token_fare || trip.tokenFare)}
            {renderRow('Full Fare', trip.full_fare || trip.fullFare)}
            {renderRow('Trip Status', trip.status || trip.trip_status || trip.state)}

            <View style={s.divider} />

            {status == 'UPCOMING' && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#4CAF50', opacity: loading ? 0.7 : 1 }]}
                onPress={handleArrive}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="check-circle" size={18} color="#fff" />
                    <Text style={s.actionText}>Mark as Arrived</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {status == 'BOARDING' && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#ff1493', opacity: loading ? 0.7 : 1 }]}
                onPress={handleStartRide}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="play" size={18} color="#fff" />
                    <Text style={s.actionText}>Start Ride</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {status == 'STARTED' && (
              <View style={s.rideActionsRow}>
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: '#4CAF50', flex: 1, opacity: loading ? 0.7 : 1 }]}
                  onPress={handleCompleteRide}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="check-circle" size={18} color="#fff" />
                      <Text style={s.actionText}>Complete</Text>
                    </>
                  )}
                </TouchableOpacity>

               
              </View>
            )}
            {status != 'COMPLETED' && <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: '#FFCDD2', flex: 1, opacity: loading ? 0.7 : 1 ,marginTop: 12}]}
                  onPress={handleCancelRide}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="x-circle" size={18} color="#ff1493" />
                      <Text style={[s.actionText, { color: '#ff1493' }]}>Cancel</Text>
                    </>
                  )}
                </TouchableOpacity>}
          </View>

        ) : null}

        {/* Bookings Section */}
        {bookings.length > 0 && (
          <View style={s.bookingsSection}>
            <Text style={s.sectionTitle}>
              <Icon name="users" size={18} color="#FF1493" /> Bookings ({bookings.length})
            </Text>
            {bookings.map((booking, index) => renderBookingCard(booking, index))}
          </View>
        )}

        {!trip && bookings.length === 0 && !loading ? (
          <View style={s.empty}>
            <Icon name="info" size={40} color="#ccc" />
            <Text style={s.emptyText}>No trip data available</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* OTP Verify Modal */}
      <Modal
        visible={otpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setOtpModalVisible(false);
          setSelectedBooking(null);
        }}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Verify OTP</Text>

            <Text style={s.modalSubText}>
              Booking ID: {selectedBooking?.booking_id || '—'}
            </Text>

            <TextInput
              value={otpInput}
              onChangeText={setOtpInput}
              placeholder="Enter OTP"
              keyboardType="number-pad"
              maxLength={6}
              style={s.otpInput}
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, s.modalCancelBtn]}
                onPress={() => {
                  setOtpModalVisible(false);
                  setSelectedBooking(null);
                }}
                disabled={verifyingOtp}
              >
                <Text style={s.modalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.modalBtn, s.modalSubmitBtn]}
                onPress={handleVerifyOtp}
                disabled={verifyingOtp}
              >
                {verifyingOtp ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.modalBtnText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
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

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  scroll: { padding: 16, paddingBottom: 40 },

  loadingBox: { paddingVertical: 50, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 20,
  },

  tripIdText: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  rowLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  rowValue: { fontSize: 13, color: '#111827', fontWeight: '600', textAlign: 'right', flex: 1 },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 14 },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  verifyOtpBtn: {
    marginTop: 8,
    backgroundColor: '#ff1493',
  },
  verifyOtpText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    elevation: 2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  modalSubText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 14,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#9CA3AF',
  },
  modalSubmitBtn: {
    backgroundColor: '#ff1493',
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  rideActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  bookingsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF1493',
    marginBottom: 12,
  },
  bookingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  bookingLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  bookingValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  phoneText: {
    color: '#FF1493',
    textDecorationLine: 'underline',
  },
  otpText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF1493',
  },
  passengersContainer: {
    marginTop: 10,
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  passengersTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  passengerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  passengerText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  statusTokenPaid: {
    backgroundColor: '#FFE4B5',
  },
  statusCompleted: {
    backgroundColor: '#C8E6C9',
  },
  statusCancelled: {
    backgroundColor: '#FFCDD2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },

  empty: { paddingVertical: 60, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 10, color: '#666' },
});

export default SelfSharingTripDetailsScreen;