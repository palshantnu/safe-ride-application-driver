import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';

const STATUS_CONFIG = {
  completed: { bg: '#DCFCE7', color: '#16A34A', label: 'Completed' },
  cancelled: { bg: '#FEE2E2', color: '#DC2626', label: 'Cancelled' },
  accepted: { bg: '#DBEAFE', color: '#2563EB', label: 'Accepted' },
  ongoing: { bg: '#FEF9C3', color: '#CA8A04', label: 'Ongoing' },
  pending: { bg: '#F3F4F6', color: '#6B7280', label: 'Pending' },
  token_paid: { bg: '#DBEAFE', color: '#2563EB', label: 'Token Paid' },
  tokenpaid: { bg: '#DBEAFE', color: '#2563EB', label: 'Token Paid' },
  started: { bg: '#FFEDD5', color: '#EA580C', label: 'Started' },
};

const getStatusCfg = (status) => {
  const key = String(status || '').toLowerCase();
  return STATUS_CONFIG[key] || STATUS_CONFIG.pending;
};

const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return (
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    '  ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  );
};

const Section = ({ title, icon, children }) => (
  <View style={s.section}>
    <View style={s.sectionHeader}>
      <Icon name={icon} size={16} color="#810a45" />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
    <View style={s.sectionBody}>{children}</View>
  </View>
);

const Row = ({ label, value, valueStyle }) => (
  <View style={s.row}>
    <Text style={s.rowLabel}>{label}</Text>
    <Text style={[s.rowValue, valueStyle]}>{value ?? '—'}</Text>
  </View>
);

const OnSpotBookingDetail = ({ navigation, route }) => {
  const { booking } = route.params || {};

  const statusCfg = useMemo(() => getStatusCfg(booking?.status), [booking?.status]);
  const createdAt = formatDateTime(booking?.created_at);
  const scheduleAt = formatDateTime(booking?.schedule_datetime);

  const total = booking?.total_amount != null ? Number(booking.total_amount) : null;
  const token = booking?.token_amount != null ? Number(booking.token_amount) : null;
  const balance = booking?.balance_amount != null ? Number(booking.balance_amount) : null;

  const formatINR = (n) => {
    if (n == null || Number.isNaN(n)) return '—';
    return `₹${n.toFixed(2)}`;
  };

  const otpVerified = booking?.otp_verified === 1 || booking?.otp_verified === '1';

  const callCustomer = () => {
    const phone = booking?.customerPhone;
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={s.container}>
      <LinearGradient
        colors={['#FF9800', '#FF9800', '#e20f7a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>OnSpot Booking</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.topCard}>
          <View style={s.topCardLeft}>
            <Text style={s.bookingIdLabel}>Booking ID</Text>
            <Text style={s.bookingId}>{booking?.booking_id || booking?.booking_no || booking?.id || '—'}</Text>
            <Text style={s.createdAt}>Created: {createdAt}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[s.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        {(booking?.landmark || booking?.full_address) && (
          <View style={s.incityTag}>
            <Icon name="map-pin" size={12} color="#fff" />
            <Text style={s.incityTagText}>Service Address</Text>
          </View>
        )}

        <Section title="Service Address" icon="map">
          <Row label="Address" value={booking?.full_address || '—'} />
          <Row label="Landmark" value={booking?.landmark || '—'} />
          <Row label="City" value={booking?.city || '—'} />
        </Section>

        <Section title="Schedule" icon="clock">
          <Row label="Scheduled For" value={scheduleAt} />
        </Section>

        <Section title="Payment" icon="credit-card">
          <Row label="Total" value={formatINR(total)} valueStyle={s.paymentTotal} />
          <Row label="Token Paid" value={formatINR(token)} valueStyle={s.paymentToken} />
          <Row label="Balance" value={formatINR(balance)} valueStyle={s.paymentBalance} />
          <Row label="Payment Mode" value={booking?.payment_mode || '—'} />
        </Section>

        <Section title="Verification" icon="check-circle">
          <Row
            label="OTP Status"
            value={otpVerified ? 'OTP Verified' : 'OTP Not Verified'}
            valueStyle={otpVerified ? s.otpVerified : s.otpNotVerified}
          />
        </Section>

        {(booking?.cancel_reason || booking?.cancelled_by) && (
          <Section title="Cancellation" icon="alert-circle">
            <Row label="Reason" value={booking?.cancel_reason || '—'} valueStyle={s.cancelReason} />
            <Row label="Cancelled By" value={booking?.cancelled_by || '—'} />
          </Section>
        )}

        {booking?.completed_at && (
          <Section title="Completion" icon="activity">
            <Row label="Completed At" value={formatDateTime(booking.completed_at)} />
          </Section>
        )}

       

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backBtn: { position: 'absolute', left: 16 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#fff' },

  scroll: { padding: 16 },

  topCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  topCardLeft: { flex: 1 },
  bookingIdLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  bookingId: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  createdAt: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },

  incityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#810a45',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  incityTagText: { fontSize: 11, color: '#fff', fontWeight: '600' },

  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBody: { paddingHorizontal: 16, paddingVertical: 8 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  rowLabel: { fontSize: 14, color: '#6B7280', flex: 1 },
  rowValue: { fontSize: 14, color: '#111827', fontWeight: '500', textAlign: 'right', flex: 1 },

  paymentTotal: { color: '#16A34A', fontWeight: '700' },
  paymentToken: { color: '#2563EB', fontWeight: '700' },
  paymentBalance: { color: '#FF9800', fontWeight: '700' },

  otpVerified: { color: '#16A34A', fontWeight: '700' },
  otpNotVerified: { color: '#6B7280', fontWeight: '600' },
  cancelReason: { color: '#DC2626', fontWeight: '700' },

  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FF1493',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 8,
    elevation: 3,
  },
  callBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

export default OnSpotBookingDetail;

