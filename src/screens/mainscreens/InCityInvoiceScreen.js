import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch } from 'react-redux';
import { GET_INVOICE, COLLECT_PAYMENT_COMPLETE_RIDE } from '../../redux/actions/action-creator';




const BRAND  = '#E91E8C';
const AMBER  = '#F59E0B';
const GREEN  = '#16A34A';
const TEXT   = '#111827';
const SUBTLE = '#6B7280';
const BORDER = '#E5E7EB';
const BG     = '#F7F8FA';
const WHITE  = '#FFFFFF';

const getAccessFeeValue = (totalFare, accessFee, accessFeeType) => {
  const fare = parseFloat(totalFare) || 0;
  const fee = parseFloat(accessFee) || 0;
  if (accessFeeType && typeof accessFeeType === 'string' && accessFeeType.toLowerCase() === 'percent') {
    return fare * (fee / 100);
  }
  return fee;
};

const Row = ({ icon, label, value, valueStyle }) => (
  <View style={s.row}>
    
    {icon == 'dollar-sign' ? <MaterialIcon name="currency-inr" size={16} color={SUBTLE} />:<Icon name={icon} size={14} color={SUBTLE} style={{ marginTop: 1 }} />}
    <Text style={s.rowLabel}>{label}</Text>
    <Text style={[s.rowValue, valueStyle]}>{value ?? '—'}</Text>
  </View>
);

const InCityInvoiceScreen = ({ navigation, route }) => {
  const { bookingData, actualDistance } = route.params || {};
  const bookingId = bookingData?.booking_id || bookingData?.id;

  const dispatch   = useDispatch();
  const intervalRef = useRef(null);
  const pulseAnim   = useRef(new Animated.Value(1)).current;

  const [invoice,    setInvoice]    = useState(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);

  const fetchInvoice = useCallback(async () => {
    try {
      const res = await dispatch(GET_INVOICE({ booking_id: bookingId }));
      console.log('fetchInvoice res', res);
      if (res?.status && res?.invoice) {
        setInvoice(res.invoice);
      }
    } catch (e) {
      console.log('fetchInvoice error', e);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  // Poll every 5 seconds
  useEffect(() => {
    fetchInvoice();
    intervalRef.current = setInterval(fetchInvoice, 5000);
    return () => clearInterval(intervalRef.current);
  }, [fetchInvoice]);

  // Stop polling once payment is done
  useEffect(() => {
    if (invoice?.status === 'PAYMENT_DONE') {
      clearInterval(intervalRef.current);
    }
  }, [invoice?.status]);

  // Pulse animation for waiting badge
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const handleCollect = async () => {
    setIsCollecting(true);
    try {
      const res = await dispatch(COLLECT_PAYMENT_COMPLETE_RIDE({ booking_id: bookingId }));
      if (res?.status) {
        clearInterval(intervalRef.current);
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      } else {
        Alert.alert('Error', res?.message || 'Failed to complete ride');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsCollecting(false);
    }
  };

  const inv = invoice || {};
  const pickup     = inv.pickup_address || bookingData?.pickup_address || bookingData?.pickup_city || '—';
  const drop       = inv.drop_address   || bookingData?.drop_address   || bookingData?.drop_city   || '—';
  const subService = inv.sub_service_name || inv.service_name || bookingData?.sub_service_name || 'In City';
  const persons    = inv.person         || bookingData?.person;
  const iCollect   = inv.i_collect;
  const actualFare = inv.fare_breakdown?.actual_fare;
  const actualDist = inv.fare_breakdown?.actual_distance || actualDistance;
  const paymentMode = inv.payment_mode;
  const status     = inv.status;
  const isPaymentDone = status === 'PAYMENT_DONE';

  if (isLoading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={{ color: SUBTLE, marginTop: 12, fontSize: 14 }}>Loading invoice...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#ff7f50" />

      {/* Header */}
      <LinearGradient
        colors={['#ff7f50', '#ff7f50', '#e20f7a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Ride Invoice</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Status card */}
        {isPaymentDone ? (
          <View style={[s.statusCard, { borderColor: '#BBF7D0' }]}>
            <View style={[s.statusIconWrap, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
              <MaterialIcon name="check-circle-outline" size={36} color={GREEN} />
            </View>
            <Text style={s.statusTitle}>Payment Received</Text>
            <Text style={s.statusSub}>The passenger has paid. Please collect the cash amount shown below.</Text>
            <View style={[s.badgeRow, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
              <View style={[s.pulseDot, { backgroundColor: GREEN }]} />
              <Text style={[s.badgeText, { color: GREEN }]}>PAYMENT DONE</Text>
            </View>
          </View>
        ) : (
          <View style={s.statusCard}>
            <View style={s.statusIconWrap}>
              <MaterialIcon name="clock-time-four-outline" size={36} color={AMBER} />
            </View>
            <Text style={s.statusTitle}>Waiting for Payment</Text>
            <Text style={s.statusSub}>The ride has been completed. Waiting for the passenger to pay.</Text>
            <View style={s.badgeRow}>
              <Animated.View style={[s.pulseDot, { opacity: pulseAnim }]} />
              <Text style={s.badgeText}>WAITING FOR PAYMENT</Text>
            </View>
          </View>
        )}
   {isPaymentDone ? (
          <TouchableOpacity
            style={s.collectBtn}
            onPress={handleCollect}
            disabled={isCollecting}
            activeOpacity={0.85}
          >
            {isCollecting ? (
              <ActivityIndicator color={WHITE} size="small" />
            ) : (
              <>
                <MaterialIcon name="cash" size={22} color={WHITE} />
                <Text style={s.collectBtnText}>
                  I Collect {iCollect ? `₹${iCollect}` : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={s.waitingHint}>
            <ActivityIndicator size="small" color={AMBER} style={{ marginRight: 10 }} />
            <Text style={s.waitingHintText}>Checking payment status every 5 seconds…</Text>
          </View>
        )}
        {/* Booking info */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <MaterialIcon name="receipt" size={16} color={BRAND} />
            <Text style={s.cardTitle}>Booking Details</Text>
          </View>
          <View style={s.cardDivider} />
          <Row icon="hash"  label="Booking ID"  value={`#${bookingId || '—'}`} />
          <Row icon="tag"   label="Service"     value={subService} />
          {/* {persons   ? <Row icon="users"       label="Passengers"    value={`${persons}`} />         : null} */}
          {paymentMode ? <Row icon="credit-card" label="Payment Mode" value={paymentMode} />          : null}
        </View>

        {/* Route card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <MaterialIcon name="map-marker-path" size={16} color={BRAND} />
            <Text style={s.cardTitle}>Trip Route</Text>
          </View>
          <View style={s.cardDivider} />
          <View style={s.routeBlock}>
            <View style={s.routeTrack}>
              <View style={s.dotGreen} />
              <View style={s.trackLine} />
              <View style={s.dotRed} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.routePoint}>
                <Text style={s.routeLabel}>Pickup</Text>
                <Text style={s.routeValue}>{pickup}</Text>
              </View>
              <View style={{ height: 14 }} />
              <View style={s.routePoint}>
                <Text style={s.routeLabel}>Drop-off</Text>
                <Text style={s.routeValue}>{drop}</Text>
              </View>
            </View>
          </View>
          {actualDist ? (
            <View style={s.distanceChip}>
              <Icon name="map" size={13} color={BRAND} />
              <Text style={s.distanceText}>
                Actual distance: <Text style={{ fontWeight: '700', color: TEXT }}>{actualDist} km</Text>
              </Text>
            </View>
          ) : null}
        </View>

        {/* Fare card */}
        {(actualFare || iCollect) ? (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <MaterialIcon name="currency-inr" size={16} color={BRAND} />
              <Text style={s.cardTitle}>Fare Breakdown</Text>
            </View>
            <View style={s.cardDivider} />
            {(() => {
              const fb = inv.fare_breakdown || {};
              const calculatedAccessFee = getAccessFeeValue(fb.actual_fare, fb.access_fee, fb.access_fee_type);
              const platformFee = parseFloat(fb.platform_fee) || 0;
              const captainAmount = (parseFloat(fb.actual_fare) || 0) - platformFee - calculatedAccessFee;

              return (
                <>
                  {actualFare ? <Row icon="dollar-sign" label="Ride Amount" value={`₹${actualFare}`} /> : null}
                  {fb.platform_fee !== undefined ? <Row icon="dollar-sign" label="Platform Fee" value={`₹${platformFee}`} /> : null}
                  {fb.access_fee !== undefined ? (
                    <Row
                      icon="dollar-sign"
                      label={`Access Fee${fb.access_fee_type === 'percent' ? ` (${fb.access_fee}%)` : ''}`}
                      value={`₹${parseFloat(calculatedAccessFee.toFixed(2))}`}
                    />
                  ) : null}
                  <View style={s.cardDivider} />
                  <Row
                    icon="dollar-sign"
                    label="Captain Amount"
                    value={`₹${parseFloat(captainAmount.toFixed(2))}`}
                    valueStyle={{ color: GREEN, fontWeight: '700' }}
                  />
                </>
              );
            })()}
            {iCollect ? (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Amount to Collect</Text>
                <Text style={s.totalValue}>₹{iCollect}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* I Collect button — only when PAYMENT_DONE */}
     

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#fff' },

  scroll: { paddingHorizontal: 16, paddingTop: 20 },

  statusCard: {
    backgroundColor: WHITE, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 14,
    borderWidth: 1, borderColor: '#FEF3C7',
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  statusIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2, borderColor: '#FDE68A',
  },
  statusTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 6, letterSpacing: -0.3 },
  statusSub:   { fontSize: 13, color: SUBTLE, textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  badgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFBEB', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: '#FDE68A',
  },
  pulseDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: AMBER },
  badgeText: { fontSize: 11, fontWeight: '800', color: AMBER, letterSpacing: 0.8 },

  card: {
    backgroundColor: WHITE, borderRadius: 16, padding: 18,
    marginBottom: 14, borderWidth: 1, borderColor: BORDER,
    elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle:  { fontSize: 14, fontWeight: '700', color: TEXT },
  cardDivider:{ height: 1, backgroundColor: BORDER, marginBottom: 14 },

  row:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  rowLabel:  { flex: 1, fontSize: 13, color: SUBTLE },
  rowValue:  { fontSize: 13, fontWeight: '600', color: TEXT, textAlign: 'right', maxWidth: '55%' },

  routeBlock: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  routeTrack: { alignItems: 'center', paddingTop: 4, width: 16 },
  dotGreen:   { width: 12, height: 12, borderRadius: 6, backgroundColor: GREEN, borderWidth: 2, borderColor: '#BBF7D0' },
  trackLine:  { width: 2, flex: 1, backgroundColor: BORDER, marginVertical: 3 },
  dotRed:     { width: 12, height: 12, borderRadius: 6, backgroundColor: '#DC2626', borderWidth: 2, borderColor: '#FECACA' },
  routePoint: {},
  routeLabel: { fontSize: 10, color: SUBTLE, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  routeValue: { fontSize: 13, color: TEXT, fontWeight: '500', lineHeight: 18 },

  distanceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FDF2F8', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#FBCFE8',
    alignSelf: 'flex-start',
  },
  distanceText: { fontSize: 12, color: SUBTLE },

  totalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 4, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: TEXT },
  totalValue: { fontSize: 20, fontWeight: '800', color: BRAND },

  collectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: GREEN, borderRadius: 16, paddingVertical: 18,
    marginTop: 6,
    elevation: 4,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6,
  },
  collectBtnText: { color: WHITE, fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },

  waitingHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14,
  },
  waitingHintText: { fontSize: 13, color: SUBTLE },
});

export default InCityInvoiceScreen;
